main();

function main() {
    const canvas = document.querySelector('#glcanvas');
    const gl = canvas.getContext('webgl');
    const width = canvas.width;

    // If we don't have a GL context, give up now
    if (!gl) {
        alert('Unable to initialize WebGL. Your browser or machine may not support it.');
        return;
    }

    // Vertex shader program is a simple fullscreen quad
    const vsSource = `
    precision highp float;
    attribute vec4 aVertexPosition;

    uniform float uFarDistance;

    varying float v_depth;

    void main() {
        vec4 vertexPosition = aVertexPosition;
        vertexPosition.z = vertexPosition.z / uFarDistance;
        gl_Position = vertexPosition;
        v_depth = (aVertexPosition.z / uFarDistance + 1.0) * 0.5;
    }
    `;

    let fsSource = `
    precision highp float;

    varying float v_depth;

    void main() {
        float fragCoordX = gl_FragCoord.x / ` + width.toFixed(1) + `;
        if (fragCoordX < 0.33) {
            gl_FragColor = vec4(vec3(gl_FragCoord.z), 1.0);
        } else if (fragCoordX < 0.66) {
            gl_FragColor = vec4(vec3(v_depth), 1.0);
        } else {
            float r = 1.0;
            if (gl_FragCoord.z == v_depth) {
                r = 0.0;
            }
            gl_FragColor = vec4(r, 0.0, 0.0, 1.0);
        }
    }
    `;

    const logDiv = document.querySelector('#log');

    let log = 'Comparing built-in depth to manual depth varying\n';
    log += '* left third represents built-in depth using gl_FragCoord\n';
    log += '* middle third represents depth using a varying\n';
    log += '* right third is the diff between the two, with discrepancies in red\n';
    log += `\n`;
    log += 'vertex shader source: ' + vsSource + '\n';
    log += `\n`;
    log += 'fragment shader source: ' + fsSource + '\n';
    log += `\n`;

    logDiv.textContent = log;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            uFarDistance: gl.getUniformLocation(shaderProgram, 'uFarDistance'),
        }
    };

    const buffers = initBuffers(gl);

    const farDistance = 1.0;
    drawScene(gl, programInfo, buffers, farDistance);

    const farDistanceBox = document.querySelector('#farDistance');
    farDistanceBox.addEventListener('change', (event) => {
        drawScene(gl, programInfo, buffers, Number.parseFloat(event.target.value));
    });
}

// create vertex buffer for a simple full-screen quad
function initBuffers(gl) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,
        1.0, -1.0, -1.0,
        -1.0, -1.0, -1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

function drawScene(gl, programInfo, buffers, farDistance) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.useProgram(programInfo.program);

    gl.uniform1f(programInfo.uniformLocations.uFarDistance, farDistance);

    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
}

