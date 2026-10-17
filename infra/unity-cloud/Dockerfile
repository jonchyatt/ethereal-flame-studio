# Unity 360 render image (SPIKE, not built or run in CI; see docs/UNITY-OFF-BOX-SPIKE.md).
#
# Editor is pinned to the version in unity/ProjectSettings/ProjectVersion.txt.
# The GameCI tag suffix (-3) is an assumption: confirm the exact tag exists at
# https://hub.docker.com/r/unityci/editor/tags before building.
ARG UNITY_VERSION=2021.2.8f1
ARG GAMECI_IMAGE_VERSION=3
FROM unityci/editor:ubuntu-${UNITY_VERSION}-base-${GAMECI_IMAGE_VERSION}

ENV DEBIAN_FRONTEND=noninteractive \
    # Graphics capability is needed for a real GL/Vulkan context, not only compute.
    NVIDIA_DRIVER_CAPABILITIES=compute,utility,graphics,display \
    NVIDIA_VISIBLE_DEVICES=all \
    DISPLAY=:99

RUN apt-get update && apt-get install -y --no-install-recommends \
      xvfb x11-utils libglu1-mesa libvulkan1 vulkan-tools mesa-utils \
      ffmpeg python3 python3-pip git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# VR metadata injection used by unity/render.sh step 3.
RUN pip3 install --no-cache-dir numpy \
    && pip3 install --no-cache-dir "git+https://github.com/google/spatial-media.git"

COPY entrypoint.sh /usr/local/bin/efs-unity-entrypoint
RUN chmod +x /usr/local/bin/efs-unity-entrypoint

# unity/ is mounted at /project at run time, never baked into the image.
WORKDIR /project
ENTRYPOINT ["/usr/local/bin/efs-unity-entrypoint"]
