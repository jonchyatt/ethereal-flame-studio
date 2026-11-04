import { FLUID_SHADERS, FLUID_VERTEX } from './mistShader'
import type { GlowMode, GlowPosition } from './presets'

export type FluidSettings = {
  palette: readonly string[]
  speed: number
  intensity: number
  height: number
  grain: number
  position: GlowPosition
  mode: GlowMode
}
type GL = WebGLRenderingContext | WebGL2RenderingContext
type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer; width: number; height: number }
type Pair = { read: Target; write: Target }
type Program = { program: WebGLProgram; uniforms: Record<string, WebGLUniformLocation> }
type Emitter = { id: number; birth: number; duration: number; x: number; y: number; radius: number; lean: number }
const attributes: WebGLContextAttributes = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }
const STEP = 1 / 60

function textureFormats(gl: GL, webgl2: boolean) {
  if (webgl2) {
    if (!gl.getExtension('EXT_color_buffer_float')) return []
    const gl2 = gl as WebGL2RenderingContext
    return [{ internal: gl2.RGBA16F, type: gl2.HALF_FLOAT }]
  }
  const formats = []
  const half = gl.getExtension('OES_texture_half_float')
  gl.getExtension('EXT_color_buffer_half_float')
  if (half) formats.push({ internal: gl.RGBA, type: half.HALF_FLOAT_OES })
  if (gl.getExtension('OES_texture_float')) {
    gl.getExtension('WEBGL_color_buffer_float')
    formats.push({ internal: gl.RGBA, type: gl.FLOAT })
  }
  return formats
}

function supportedFormat(gl: GL, webgl2: boolean) {
  for (const format of textureFormats(gl, webgl2)) {
    const texture = gl.createTexture(), framebuffer = gl.createFramebuffer()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texImage2D(gl.TEXTURE_2D, 0, format.internal, 2, 2, 0, gl.RGBA, format.type, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const supported = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.deleteTexture(texture)
    gl.deleteFramebuffer(framebuffer)
    if (supported) return format
  }
  return null
}

// A WebGL2 request locks the canvas's context type. Probe disposable canvases
// first so a non-renderable half-float implementation can fall back to WebGL1.
function contextKind(): 'webgl2' | 'webgl' | null {
  for (const kind of ['webgl2', 'webgl'] as const) {
    const probe = document.createElement('canvas')
    const gl = probe.getContext(kind, attributes) as GL | null
    if (!gl) continue
    let supported = false
    try { supported = supportedFormat(gl, kind === 'webgl2') !== null }
    finally { gl.getExtension('WEBGL_lose_context')?.loseContext() }
    if (supported) return kind
  }
  return null
}

function linear(hex: string): number[] {
  const raw = hex.replace('#', '')
  const text = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw
  return [0, 2, 4].map(offset => {
    const s = (Number.parseInt(text.slice(offset, offset + 2), 16) || 0) / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
}

export class FluidSimulation {
  readonly gl: GL
  readonly backend: 'webgl2' | 'webgl'
  private readonly format: { internal: number; type: number }
  private readonly buffer: WebGLBuffer
  private programs = {} as Record<keyof typeof FLUID_SHADERS, Program>
  private targets: Target[] = []
  private velocity!: Pair
  private dye!: Pair
  private pressure!: Pair
  private curl!: Target
  private divergence!: Target
  private bloom!: Pair
  private tracer: Pair | null = null
  private traceId: number | undefined
  private traceValues = new Float32Array(48)
  private aspect = 1
  private emitters: Emitter[] = []
  private seed = 0x41c6ce57
  private nextBirth = 0
  private signature = ''
  private palette: number[][] = []
  private emitterValues = new Float32Array(48)
  private inkValues = new Float32Array(48)
  private births = 0
  time = 0

  constructor(private canvas: HTMLCanvasElement) {
    const kind = contextKind()
    if (!kind) throw new Error('Fluid textures are unsupported')
    this.backend = kind
    const gl = canvas.getContext(kind, attributes) as GL | null
    if (!gl) throw new Error('Unable to create fluid context')
    this.gl = gl
    const format = supportedFormat(gl, kind === 'webgl2')
    if (!format) throw new Error('Fluid textures are unsupported')
    this.format = format
    const buffer = gl.createBuffer()
    if (!buffer) throw new Error('Unable to allocate fluid triangle')
    this.buffer = buffer
    try {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      for (const name of Object.keys(FLUID_SHADERS) as (keyof typeof FLUID_SHADERS)[]) this.programs[name] = this.program(FLUID_SHADERS[name])
      gl.disable(gl.BLEND)
      gl.clearColor(0, 0, 0, 0)
    } catch (error) { this.dispose(); throw error }
  }

  private program(fragment: string): Program {
    const gl = this.gl
    const compile = (source: string, type: number) => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to allocate shader')
      if (this.backend === 'webgl2') {
        source = '#version 300 es\n' + source.replace(/attribute/g, 'in').replace(/varying/g, type === gl.VERTEX_SHADER ? 'out' : 'in').replace(/texture2D/g, 'texture')
        if (type === gl.FRAGMENT_SHADER) source = source.replace('precision highp float;', 'precision highp float;\nout vec4 fragColor;').replace(/gl_FragColor/g, 'fragColor')
      }
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        throw new Error(message || 'Fluid shader compilation failed')
      }
      return shader
    }
    const vertex = compile(FLUID_VERTEX, gl.VERTEX_SHADER)
    let fragmentShader: WebGLShader | null = null
    const program = gl.createProgram()
    if (!program) { gl.deleteShader(vertex); throw new Error('Unable to allocate fluid program') }
    try {
      fragmentShader = compile(fragment, gl.FRAGMENT_SHADER)
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragmentShader)
      gl.bindAttribLocation(program, 0, 'a_position')
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Fluid link failed')
    } catch (error) { gl.deleteProgram(program); throw error }
    finally { gl.deleteShader(vertex); if (fragmentShader) gl.deleteShader(fragmentShader) }
    const uniforms: Record<string, WebGLUniformLocation> = {}
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) {
      const name = gl.getActiveUniform(program, i)!.name
      const location = gl.getUniformLocation(program, name)
      if (location) uniforms[name.replace('[0]', '')] = location
    }
    return { program, uniforms }
  }

  private target(width: number, height: number): Target {
    const gl = this.gl
    const texture = gl.createTexture(), framebuffer = gl.createFramebuffer()
    if (!texture || !framebuffer) {
      gl.deleteTexture(texture); gl.deleteFramebuffer(framebuffer)
      throw new Error('Unable to allocate fluid grid')
    }
    const target = { texture, framebuffer, width, height }
    this.targets.push(target)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, this.format.internal, width, height, 0, gl.RGBA, this.format.type, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Incomplete fluid grid')
    gl.clear(gl.COLOR_BUFFER_BIT)
    return target
  }

  resize(width: number, height: number) {
    const aspect = width / height
    if (this.targets.length && Math.abs(aspect - this.aspect) < 0.002) return
    this.clearTargets()
    this.aspect = aspect
    const size = (long: number) => aspect > 1 ? [long, Math.max(16, Math.round(long / aspect))] : [Math.max(16, Math.round(long * aspect)), long]
    const [vw, vh] = size(128), [dw, dh] = size(256)
    const pair = (w: number, h: number) => ({ read: this.target(w, h), write: this.target(w, h) })
    this.velocity = pair(vw, vh)
    this.dye = pair(dw, dh)
    this.pressure = pair(vw, vh)
    this.curl = this.target(vw, vh)
    this.divergence = this.target(vw, vh)
    const [bw, bh] = size(64)
    this.bloom = pair(bw, bh)
    this.reset()
  }

  reset() {
    for (const target of this.targets) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.framebuffer)
      this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    }
    this.time = 0
    this.emitters = []
    this.seed = 0x41c6ce57
    this.nextBirth = 0
    this.births = 0
  }

  private random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) | 0
    return (this.seed >>> 0) / 4294967296
  }

  private colour(time: number, settings: FluidSettings) {
    const speed = Math.max(0.01, Math.min(1.2, settings.speed))
    const phase = settings.mode === 'idle' ? 7 : ((Math.max(0, time - 1) * speed) % 9.5 + 9.5) % 9.5
    const stops = [0, 1.5, 3.3, 4.3, 5, 9.5]
    const index = Math.min(4, stops.findIndex((end, i) => i > 0 && phase < end) - 1)
    const a = Math.max(0, index), b = Math.min(4, a + 1)
    const t = (phase - stops[a]) / (stops[a + 1] - stops[a])
    const blend = t * t * (3 - 2 * t)
    // Continuous colour at the inlet: adjacent sources share a smooth phase
    // field. Once injected, pigment is transported and never recoloured.
    // Short phases need more inlet energy to survive mixing with older blue.
    const energy = [0.9, 2.2, 1.25, 2.0, 0.9]
    return this.palette[a].map((value, channel) => value * energy[a] * (1 - blend) + this.palette[b][channel] * energy[b] * blend)
  }

  configure(settings: FluidSettings) {
    const signature = [settings.position, settings.height, settings.palette.join(','), settings.mode === 'idle'].join('|')
    if (signature === this.signature) return false
    this.signature = signature
    this.palette = settings.palette.length ? settings.palette.map(linear) : [linear('#1a2e5c')]
    while (this.palette.length < 5) this.palette.push(this.palette[0])
    this.reset()
    return true
  }

  private sources(settings: FluidSettings) {
    this.emitters = this.emitters.filter(e => this.time - e.birth < e.duration)
    if (this.time >= this.nextBirth) {
      // A low-discrepancy sequence avoids accidental clumps or a sweeping row.
      const x = 0.03 + ((this.births * 0.61803398875 + 0.28 + this.random() * 0.13) % 1) * 0.94
      const y = settings.position === 'full' ? 0.08 + ((this.births * 0.381966 + this.random() * 0.18) % 1) * 0.58
        : settings.position === 'top' ? 1 - settings.height * (0.70 + this.random() * 0.20)
          : 0.06 + this.random() * 0.13
      const duration = 2.8 + this.random() * 1.2
      this.emitters.push({ id: this.births, birth: this.time, duration, x, y,
        radius: (settings.position === 'full' ? 0.13 : 0.085) + this.random() * 0.055,
        lean: (this.random() - 0.5) * 0.07 })
      this.births++
      this.nextBirth = this.time + 0.29 + this.random() * 0.07
    }
    this.emitterValues.fill(0)
    this.inkValues.fill(0)
    this.traceValues.fill(0)
    this.emitters.slice(-12).forEach((emitter, i) => {
      const life = (this.time - emitter.birth) / emitter.duration
      const phaseOffset = 0.28 * Math.sin(emitter.x * 5.1 + emitter.y * 3.2 + emitter.birth * 0.18)
      const colour = this.colour(this.time + 1.15 * Math.min(1, this.time / 1.5) + phaseOffset, settings)
      this.emitterValues.set([emitter.x + emitter.lean * life, emitter.y, emitter.radius, Math.sin(Math.PI * life) ** 2], i * 4)
      this.inkValues.set([...colour, emitter.lean], i * 4)
      if (emitter.id === this.traceId) this.traceValues.set(this.emitterValues.subarray(i * 4, i * 4 + 4), i * 4)
    })
  }

  private pass(name: keyof typeof FLUID_SHADERS, target: Target | null, textures: Record<string, Target>, uniforms: Record<string, number | number[] | Float32Array> = {}) {
    const gl = this.gl, program = this.programs[name], locations = program.uniforms
    gl.useProgram(program.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null)
    gl.viewport(0, 0, target?.width ?? this.canvas.width, target?.height ?? this.canvas.height)
    let unit = 0
    for (const [key, texture] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit)
      gl.bindTexture(gl.TEXTURE_2D, texture.texture)
      gl.uniform1i(locations[key] ?? null, unit++)
    }
    gl.uniform2f(locations.u_texel ?? null, 1 / this.velocity.read.width, 1 / this.velocity.read.height)
    gl.uniform1f(locations.u_aspect ?? null, this.aspect)
    gl.uniform1f(locations.u_dt ?? null, STEP)
    gl.uniform1f(locations.u_time ?? null, this.time)
    for (const [key, value] of Object.entries(uniforms)) {
      if (typeof value === 'number') gl.uniform1f(locations[key] ?? null, value)
      else if (value.length === 2) gl.uniform2fv(locations[key] ?? null, value)
      else gl.uniform4fv(locations[key] ?? null, value)
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  private swap(pair: Pair) { const previous = pair.read; pair.read = pair.write; pair.write = previous }

  step(settings: FluidSettings) {
    this.sources(settings)
    const v = this.velocity, d = this.dye, p = this.pressure
    const vTexel = [1 / v.read.width, 1 / v.read.height], dTexel = [1 / d.read.width, 1 / d.read.height]
    this.pass('advect', v.write, { u_source: v.read, u_velocity: v.read }, { u_source_texel: vTexel, u_decay: 0.16, u_colour_decay: 0, u_dye_pass: 0 })
    this.swap(v)
    this.pass('inject', v.write, { u_source: v.read }, { u_emitters: this.emitterValues, u_inks: this.inkValues, u_velocity_pass: 1 })
    this.swap(v)
    this.pass('curl', this.curl, { u_velocity: v.read })
    this.pass('force', v.write, { u_velocity: v.read, u_dye: d.read, u_curl: this.curl }, { u_source_texel: dTexel })
    this.swap(v)
    this.pass('divergence', this.divergence, { u_velocity: v.read })
    // Warm-started Jacobi projection keeps the bandwidth bounded on phones.
    for (let i = 0; i < 8; i++) {
      this.pass('pressure', p.write, { u_source: p.read, u_divergence: this.divergence })
      this.swap(p)
    }
    this.pass('project', v.write, { u_source: p.read, u_velocity: v.read })
    this.swap(v)
    if (this.tracer) {
      this.pass('advect', this.tracer.write, { u_source: this.tracer.read, u_velocity: v.read, u_dye: d.read }, {
        u_source_texel: dTexel, u_decay: 0.45, u_colour_decay: 0.7, u_dye_pass: 2,
      })
      this.swap(this.tracer)
    }
    this.pass('advect', d.write, { u_source: d.read, u_velocity: v.read }, { u_source_texel: dTexel, u_decay: 0.45, u_colour_decay: 0.7, u_dye_pass: 1 })
    this.swap(d)
    this.pass('inject', d.write, { u_source: d.read }, { u_emitters: this.emitterValues, u_inks: this.inkValues, u_velocity_pass: 0 })
    this.swap(d)
    // Optional passive tracer for source-following proof. It sees the real
    // velocity and total-density edge loss, but never feeds the simulation.
    if (this.tracer) {
      this.pass('inject', this.tracer.write, { u_source: this.tracer.read }, { u_emitters: this.traceValues, u_inks: this.inkValues, u_velocity_pass: 0 })
      this.swap(this.tracer)
    }
    this.time += STEP
  }

  setTraceSource(id: number | undefined) {
    if (id === this.traceId) return
    this.traceId = id
    if (id !== undefined && !this.tracer) this.tracer = {
      read: this.target(this.dye.read.width, this.dye.read.height),
      write: this.target(this.dye.read.width, this.dye.read.height),
    }
    this.reset()
  }

  sourceSnapshot() {
    return this.emitters.map(({ id, birth, duration, x, y }) => ({ id, birth, duration, x, y }))
  }

  drawTrace() {
    if (this.tracer) this.pass('trace', null, { u_source: this.tracer.read }, {
      u_source_texel: [1 / this.tracer.read.width, 1 / this.tracer.read.height],
    })
  }

  advance(targetTime: number, settings: FluidSettings, maxSteps = 4) {
    if (targetTime < this.time - STEP) this.reset()
    for (let i = 0; i < maxSteps && this.time + STEP <= targetTime + 0.00001; i++) this.step(settings)
  }

  draw(settings: FluidSettings, answerAge: number) {
    // Wide separable bloom is made only from transported dye, at 64px long side.
    this.pass('blur', this.bloom.write, { u_source: this.dye.read }, {
      u_source_texel: [1 / this.dye.read.width, 1 / this.dye.read.height], u_direction: [0.035 / this.aspect, 0],
    })
    this.swap(this.bloom)
    this.pass('blur', this.bloom.write, { u_source: this.bloom.read }, {
      u_source_texel: [1 / this.bloom.read.width, 1 / this.bloom.read.height], u_direction: [0, 0.035],
    })
    this.swap(this.bloom)
    this.pass('display', null, { u_source: this.dye.read, u_bloom: this.bloom.read }, {
      u_source_texel: [1 / this.dye.read.width, 1 / this.dye.read.height],
      u_bloom_texel: [1 / this.bloom.read.width, 1 / this.bloom.read.height],
      u_intensity: Math.max(0, Math.min(1.5, settings.intensity)), u_grain: Math.max(0, Math.min(1, settings.grain)),
      u_position: settings.position === 'full' ? 2 : settings.position === 'top' ? 1 : 0,
      u_height: Math.max(0.2, Math.min(0.96, settings.height)), u_answer: answerAge, u_entry: Math.min(1, this.time),
    })
  }

  private clearTargets() {
    for (const target of this.targets) { this.gl.deleteTexture(target.texture); this.gl.deleteFramebuffer(target.framebuffer) }
    this.targets = []
    this.tracer = null
    this.traceId = undefined
  }

  dispose() {
    this.clearTargets()
    for (const { program } of Object.values(this.programs)) this.gl.deleteProgram(program)
    this.programs = {} as typeof this.programs
    this.gl.deleteBuffer(this.buffer)
  }
}
