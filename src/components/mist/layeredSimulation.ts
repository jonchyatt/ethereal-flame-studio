import { FluidSimulation, type FluidSettings, type Target } from './fluidSimulation'
import { GEMINI_TOP_LAYER } from './layeredPreset'
import { FLUID_VERTEX } from './mistShader'

export type LayerSample = { hash: number; bright: number; error: number }

// Keep the two approved simulations and display shaders intact. Only their
// final images meet here, in one context and one browser compositor surface.
export class LayeredSimulation {
  private base: FluidSimulation
  private top: FluidSimulation
  readonly gl: FluidSimulation['gl']
  readonly backend: FluidSimulation['backend']
  private program: WebGLProgram | null = null
  private buffer: WebGLBuffer | null = null
  private images: Target[] = []
  private baseLocation: WebGLUniformLocation | null = null
  private topLocation: WebGLUniformLocation | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.base = new FluidSimulation(canvas)
    this.gl = this.base.gl
    this.backend = this.base.backend
    try { this.top = new FluidSimulation(canvas, this.base) }
    catch (error) { this.base.dispose(); throw error }
    const gl = this.gl
    const shaders: WebGLShader[] = []
    try {
      const compile = (source: string, type: number) => {
        const shader = gl.createShader(type)
        if (!shader) throw new Error('Unable to allocate layered shader')
        shaders.push(shader)
        if (this.backend === 'webgl2') {
          source = '#version 300 es\n' + source.replace(/attribute/g, 'in').replace(/varying/g, type === gl.VERTEX_SHADER ? 'out' : 'in').replace(/texture2D/g, 'texture')
          if (type === gl.FRAGMENT_SHADER) source = source.replace('precision highp float;', 'precision highp float;\nout vec4 fragColor;').replace(/gl_FragColor/g, 'fragColor')
        }
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Layered shader compilation failed')
        return shader
      }
      this.program = gl.createProgram()
      if (!this.program) throw new Error('Unable to allocate layered program')
      gl.attachShader(this.program, compile(FLUID_VERTEX, gl.VERTEX_SHADER))
      gl.attachShader(this.program, compile(`
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_base;
uniform sampler2D u_top;
void main() {
  vec3 base = texture2D(u_base, v_uv).rgb;
  vec3 top = texture2D(u_top, v_uv).rgb;
  // Screen preserves each image's black space; the original Gemini display
  // mask already feathers the colour band to black above the midpoint.
  gl_FragColor = vec4(base + top - base * top, 1.0);
}`, gl.FRAGMENT_SHADER))
      gl.bindAttribLocation(this.program, 0, 'a_position')
      gl.linkProgram(this.program)
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(this.program) || 'Layered program link failed')
      this.baseLocation = gl.getUniformLocation(this.program, 'u_base')
      this.topLocation = gl.getUniformLocation(this.program, 'u_top')
      this.buffer = gl.createBuffer()
      if (!this.buffer) throw new Error('Unable to allocate layered triangle')
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    } catch (error) { this.dispose(); throw error }
    finally { for (const shader of shaders) gl.deleteShader(shader) }
  }

  get time() { return this.base.time }

  private topSettings(settings: FluidSettings): FluidSettings {
    return { ...GEMINI_TOP_LAYER, mode: settings.mode, style: settings.style }
  }

  configure(settings: FluidSettings) {
    const baseChanged = this.base.configure(settings)
    const topChanged = this.top.configure(this.topSettings(settings))
    if (baseChanged || topChanged) {
      this.base.reset()
      this.top.reset()
    }
    return baseChanged || topChanged
  }

  resize(width: number, height: number) {
    this.base.resize(width, height)
    this.top.resize(width, height)
    if (this.images[0]?.width === width && this.images[0]?.height === height) return
    this.releaseImages()
    const gl = this.gl
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture(), framebuffer = gl.createFramebuffer()
      if (!texture || !framebuffer) {
        gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer)
        throw new Error('Unable to allocate layered image')
      }
      this.images.push({ texture, framebuffer, width, height })
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      // Match the standalone canvas's eight-bit display output, including its
      // highlight shoulder and dithering, before screen compositing.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete layered image')
    }
  }

  advance(time: number, settings: FluidSettings, maxSteps = 4) {
    this.base.advance(time, settings, maxSteps)
    this.top.advance(time, this.topSettings(settings), maxSteps)
  }

  draw(settings: FluidSettings, answerAge: number) {
    this.base.draw(settings, answerAge, this.images[0])
    this.top.draw(this.topSettings(settings), answerAge, this.images[1])
    const gl = this.gl
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.images[0].width, this.images[0].height)
    gl.useProgram(this.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    for (let i = 0; i < 2; i++) {
      gl.activeTexture(gl.TEXTURE0 + i)
      gl.bindTexture(gl.TEXTURE_2D, this.images[i].texture)
    }
    gl.uniform1i(this.baseLocation, 0)
    gl.uniform1i(this.topLocation, 1)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  // Explicit diagnostic request only; no GPU readback during live animation.
  sampleLayers(): LayerSample[] {
    const gl = this.gl
    try {
      return this.images.map(target => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer)
        const pixels = new Uint8Array(target.width * target.height * 4)
        gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        let hash = 2166136261, bright = 0
        for (let i = 0; i < pixels.length; i++) {
          hash = Math.imul(hash ^ pixels[i], 16777619)
          if (i % 4 !== 3 && pixels[i] > 30) bright++
        }
        return { hash, bright, error: gl.getError() }
      })
    } finally { gl.bindFramebuffer(gl.FRAMEBUFFER, null) }
  }

  setTraceSource(id: number | undefined) { this.base.setTraceSource(id) }
  sourceSnapshot() { return this.base.sourceSnapshot() }
  drawTrace() { this.base.drawTrace() }

  private releaseImages() {
    for (const image of this.images) {
      this.gl.deleteTexture(image.texture)
      this.gl.deleteFramebuffer(image.framebuffer)
    }
    this.images = []
  }

  dispose() {
    this.base.dispose()
    this.top.dispose()
    this.releaseImages()
    this.gl.deleteProgram(this.program)
    this.gl.deleteBuffer(this.buffer)
  }
}
