const numbers = [
    1,
    12,
    123,
    1234,
    12345,
    123456,
    1234567,
    12345678
];

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

    // check for float texture support
    if (!gl.getExtension('OES_texture_float')) {
        alert('OES_texture_float is not supported by WebGL on this browser or machine.');
        return;
    }

    // Vertex shader program is a simple fullscreen quad
    const vsSource = `
    attribute vec4 aVertexPosition;

    void main() {
        gl_Position = aVertexPosition;
    }
    `;

    const numbersLength = numbers.length;

    // Fragment shader program
    let fsSource = `
    precision highp float;
    uniform sampler2D uFloatTexture;\n`;

    fsSource +=
    `
    float TEST_COUNT = ` + numbersLength.toFixed(1) + `;
    float WIDTH = ` + width.toFixed(1) + `;
    `;

    fsSource +=
    `
    float getExpected(int index) {`

    for (let i = 0; i < numbersLength; i++) {
        fsSource += `
        if (index == ` + i + `) {
            return ` + numbers[i].toFixed(5) + `;
        }`;
    }

    fsSource +=
    `   return 0.0;
    }
    `;


    fsSource +=
    `
    void main() {
        float texcoord = gl_FragCoord.x / WIDTH;
        float actual = texture2D(uFloatTexture, vec2(texcoord, 0.5)).r;

        int expectedIndex = int(floor(texcoord * TEST_COUNT));
        float expected = getExpected(expectedIndex);

        if (gl_FragCoord.y < 10.0) {
            // stepped gradient to indicate columns
            gl_FragColor = vec4(0.0, float(expectedIndex) / float(TEST_COUNT), 0.0, 1.0);
        } else {
            gl_FragColor = vec4(abs(expected - actual), 0.0, 0.0, 1.0);
        }
    }
    `;

    const logDiv = document.querySelector('#log');

    let log = 'diffing numbers: ' + JSON.stringify(numbers) + '\n';
    log += '* each green gradation represents a number being diffed\n';
    log += '* black indicates the diff between float texture read and hardcoded value in the shader was zero\n';
    log += '* red indicates the diff between float texture read and harcoded value in the shader was nonzero\n';
    log += `\n`;
    log += 'fragment shader source: ' + fsSource + '\n';

    logDiv.textContent = log;


    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            uFloatTexture: gl.getUniformLocation(shaderProgram, 'uFloatTexture')
        }
    };

    const buffers = initBuffers(gl);
    const texture = getFloatTexture(gl);

    drawScene(gl, programInfo, buffers, texture);
}

// create vertex buffer for a simple full-screen quad
function initBuffers(gl) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = [
        1.0, 1.0,
        -1.0, 1.0,
        1.0, -1.0,
        -1.0, -1.0,
    ];

    gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW);

    return {
        position: positionBuffer,
    };
}

function drawScene(gl, programInfo, buffers, texture) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the canvas before we start drawing on it.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const numComponents = 2;
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

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(programInfo.uniformLocations.uFloatTexture, 0);

    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
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

function getFloatTexture(gl) {
    const numbersLength = numbers.length;
    const floats = new Array(numbersLength * 4);
    for (let i = 0; i < numbersLength; i++) {
        floats[i * 4] = numbers[i];
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = numbersLength;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.FLOAT;

    const pixels = new Float32Array(floats);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        width, height, border, srcFormat, srcType,
        pixels);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return texture;
}
