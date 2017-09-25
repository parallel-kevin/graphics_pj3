var SOLID_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'attribute vec4 a_Normal;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    'uniform vec3 u_DirectionLight;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '  float nDotL = max(dot(normal, u_DirectionLight), 0.0);\n' +
    '  vec3 diffuse = a_Color.rgb * nDotL;\n' +
    '  v_Color = vec4(vec3(0.0,0.1,0.1)+diffuse , a_Color.a);\n' +
    '}\n';

// Fragment shader for single color drawing
var SOLID_FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';

// Vertex shader for texture drawing
var TEXTURE_VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Normal;\n' +
    'attribute vec2 a_TexCoord;\n' +
    'uniform mat4 u_MvpMatrix;\n' +
    'uniform mat4 u_NormalMatrix;\n' +
    'varying float v_NdotL;\n' +
    'varying vec2 v_TexCoord;\n' +
    'void main() {\n' +
    '  vec3 lightDirection = vec3(0.0, 0.0, 1.0);\n' + // Light direction(World coordinate)
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '  v_NdotL = max(dot(normal, lightDirection), 0.0);\n' +
    '  v_TexCoord = a_TexCoord;\n' +
    '}\n';

// Fragment shader for texture drawing
var TEXTURE_FSHADER_SOURCE =
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    'uniform sampler2D u_Sampler;\n' +
    'varying vec2 v_TexCoord;\n' +
    'varying float v_NdotL;\n' +
    'void main() {\n' +
    '  vec4 color = texture2D(u_Sampler, v_TexCoord);\n' +
    '  gl_FragColor = vec4(color.rgb * v_NdotL , color.a);\n' +
    '}\n';

var CameraMoveForward = 0;
var CameraMoveRight = 0;
var CameraRotateUp = 0;
var CameraRotateRight = 0;

var SceneObjectList = [];

var SceneObject = function() {
    this.model;  	 //a model contains some vertex buffer
    this.filePath;   //obj file path
    this.objDoc;
    this.drawingInfo;
    this.transform;
    this.valid = 0;
}

function main() {
    // Retrieve <canvas> element
    var canvas = document.getElementById('webgl');

    // Get the rendering context for WebGL
    var gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get the rendering context for WebGL');
        return;
    }

    // Initialize shaders
    var solidProgram = createProgram(gl, SOLID_VSHADER_SOURCE, SOLID_FSHADER_SOURCE);
    var texProgram = createProgram(gl, TEXTURE_VSHADER_SOURCE, TEXTURE_FSHADER_SOURCE);
    if (!solidProgram || !texProgram) {
        console.log('Failed to intialize shaders.');
        return;
    }

    // Get storage locations of attribute and uniform variables in program object for single color drawing
    solidProgram.a_Position = gl.getAttribLocation(solidProgram, 'a_Position');
    solidProgram.a_Color = gl.getAttribLocation(solidProgram, 'a_Color');
    solidProgram.a_Normal = gl.getAttribLocation(solidProgram, 'a_Normal');
    solidProgram.u_MvpMatrix = gl.getUniformLocation(solidProgram, 'u_MvpMatrix');
    solidProgram.u_NormalMatrix = gl.getUniformLocation(solidProgram, 'u_NormalMatrix');
    solidProgram.u_DirectionLight = gl.getUniformLocation(solidProgram, 'u_DirectionLight');

    // Get storage locations of attribute and uniform variables in program object for texture drawing
    texProgram.a_Position = gl.getAttribLocation(texProgram, 'a_Position');
    texProgram.a_Normal = gl.getAttribLocation(texProgram, 'a_Normal');
    texProgram.a_TexCoord = gl.getAttribLocation(texProgram, 'a_TexCoord');
    texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, 'u_MvpMatrix');
    texProgram.u_MvpMatrix = gl.getUniformLocation(texProgram, 'u_MvpMatrix');
    texProgram.u_NormalMatrix = gl.getUniformLocation(texProgram, 'u_NormalMatrix');
    texProgram.u_Sampler = gl.getUniformLocation(texProgram, 'u_Sampler');

    if (solidProgram.a_Position < 0 || solidProgram.a_Normal < 0 ||
        !solidProgram.u_MvpMatrix || !solidProgram.u_NormalMatrix || solidProgram.a_Color < 0 ||
        texProgram.a_Position < 0 || texProgram.a_Normal < 0 || texProgram.a_TexCoord < 0 ||
        !texProgram.u_MvpMatrix || !texProgram.u_NormalMatrix || !texProgram.u_Sampler) {
        console.log('Failed to get the storage location of attribute or uniform variable');
        return;
    }

    for(var i =0; i<ObjectList.length; i++){
        var e = ObjectList[i];
        var so = new SceneObject();
        // Prepare empty buffer objects for vertex coordinates, colors, and normals
        so.model = initVertexBuffers(gl, solidProgram);
        if (!so.model) {
            console.log('Failed to set the vertex information');
            so.valid = 0;
            continue;
        }
        so.valid = 1;
        so.kads= e.kads;
        so.transform = e.transform;
        so.objFilePath = e.objFilePath;
        so.color = e.color;
        //补齐最后一个alpha值
        if(so.color.length ==3 ){
            so.color.push(1.0);
        }
        // Start reading the OBJ file
        readOBJFile(so, gl, 1.0, true);

        //压入物体列表中
        SceneObjectList.push(so);
    }

    // Set the vertex information
    var textureBuffer = new Array();
    var obj;
    obj = initTextureVertexBuffers(gl, boxRes);
    obj.texture = initTextures(gl, boxRes);
    textureBuffer.push(obj);
    obj = initTextureVertexBuffers(gl, floorRes);
    obj.texture = initTextures(gl, floorRes);
    textureBuffer.push(obj);

    // Set the clear color and enable the depth test
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Calculate the view projection matrix

    // Start drawing
    var currentAngle = 0.0; // Current rotation angle (degrees)
    var tick = function() {
        currentAngle = animate(currentAngle);  // Update current rotation angle

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Clear color and depth buffers
        // Draw a cube in single color
        drawSolidCube(gl, solidProgram, currentAngle);
        // Draw a cube with texture
        for (var i=0; i<textureBuffer.length; i++)
            drawTexCube(gl, texProgram, textureBuffer[i], textureBuffer[i].texture);

        window.requestAnimationFrame(tick);
        compute();
    };
    tick();
}

var g_last = Date.now();
var eye = new Vector3(CameraPara.eye);
var at = new Vector3(CameraPara.at);
var up = new Vector3(CameraPara.up);
var forward = VectorMinus(at,eye).normalize();
var right = VectorCross(forward,up).normalize();
function compute() {
    var now = Date.now();
    var elapsed = now - g_last;
    g_last = now;
    var forwardDelta = VectorMultNum(forward,elapsed * MOVE_VELOCITY * CameraMoveForward / 1000.0);
    var rightDelta = VectorMultNum(right,elapsed * MOVE_VELOCITY * CameraMoveRight / 1000.0);
    var rightDegree = elapsed * ROT_VELOCITY * CameraRotateRight / 1000.0;
    if (rightDegree==90 || rightDegree==-90) {
        forward = VectorMultNum(right, rightDegree/90);
        right = VectorCross(forward,up).normalize();
    }
    else {
        forward = VectorAdd(forward, VectorMultNum(right, Math.tan(rightDegree/180*Math.PI))).normalize();
        right = VectorCross(forward,up).normalize();
    }
    var upDegree = elapsed * ROT_VELOCITY * CameraRotateUp / 1000.0;
    if (upDegree==90 || upDegree==-90) {
        up = VectorMultNum(forward, upDegree/90);
        forward = VectorCross(up,right).normalize();
    }
    else {
        up = VectorAdd(up, VectorMultNum(forward, -Math.tan(upDegree/180*Math.PI))).normalize();
        forward = VectorCross(up, right).normalize();
    }
    eye = VectorAdd(VectorAdd(forwardDelta, rightDelta), eye);
    at = VectorAdd(VectorMultNum(forward, 5), eye);
}

document.onkeydown = function (evt) {
    if (evt.keyCode==87)
        CameraMoveForward = 1;
    else if (evt.keyCode==83)
        CameraMoveForward = -1;
    else if (evt.keyCode==65)
        CameraMoveRight = -1;
    else if (evt.keyCode==68)
        CameraMoveRight = 1;
    else if (evt.keyCode==74)
        CameraRotateRight = -1;
    else if (evt.keyCode==76)
        CameraRotateRight = 1;
    else if (evt.keyCode==73)
        CameraRotateUp = 1;
    else if (evt.keyCode==75)
        CameraRotateUp = -1;
}

document.onkeyup = function (evt) {
    if (evt.keyCode==87)
        CameraMoveForward = 0;
    else if (evt.keyCode==83)
        CameraMoveForward = 0;
    else if (evt.keyCode==65)
        CameraMoveRight = 0;
    else if (evt.keyCode==68)
        CameraMoveRight = 0;
    else if (evt.keyCode==74)
        CameraRotateRight = 0;
    else if (evt.keyCode==76)
        CameraRotateRight = 0;
    else if (evt.keyCode==73)
        CameraRotateUp = 0;
    else if (evt.keyCode==75)
        CameraRotateUp = 0;
}

function initTextureVertexBuffers(gl, obj) {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3

    var vertices = new Float32Array(obj.vertex);

    var normals = new Float32Array([   // Normal
        0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,     // v0-v1-v2-v3 front
        1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,     // v0-v3-v4-v5 right
        0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,     // v0-v5-v6-v1 up
        -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,     // v1-v6-v7-v2 left
        0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,     // v7-v4-v3-v2 down
        0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0      // v4-v7-v6-v5 back
    ]);

    var texCoords = new Float32Array(obj.texCoord);

    var indices = new Uint8Array(obj.index);

    var o = new Object(); // Utilize Object to to return multiple buffer objects together

    // Write vertex information to buffer object
    o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    o.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    o.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
    if (!o.vertexBuffer || !o.normalBuffer || !o.texCoordBuffer || !o.indexBuffer) return null;
    //if (!o.vertexBuffer || !o.texCoordBuffer || !o.indexBuffer) return null;
    
    o.numIndices = indices.length;
    o.scale = obj.scale;
    o.translate = obj.translate;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return o;
}

// Create an buffer object and perform an initial configuration
function initVertexBuffers(gl, program) {
    var o = new Object(); // Utilize Object object to return multiple buffer objects
    o.vertexBuffer = createEmptyArrayBuffer(gl, program.a_Position, 3, gl.FLOAT);
    o.normalBuffer = createEmptyArrayBuffer(gl, program.a_Normal, 3, gl.FLOAT);
    o.colorBuffer = createEmptyArrayBuffer(gl, program.a_Color, 4, gl.FLOAT);
    o.indexBuffer = gl.createBuffer();
    if (!o.vertexBuffer || !o.normalBuffer || !o.colorBuffer || !o.indexBuffer) { return null; }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return o;
}

// Create a buffer object, assign it to attribute variables, and enable the assignment
function createEmptyArrayBuffer(gl, a_attribute, num, type) {
    var buffer =  gl.createBuffer();  // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);  // Assign the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);  // Enable the assignment

    //在buffer中填入type和element数量信息，以备之后绘制过程中绑定shader使用
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

// Read a file
function readOBJFile(so, gl, scale, reverse) {
    var request = new XMLHttpRequest();

    request.onreadystatechange = function() {
        if (request.readyState === 4 && request.status !== 404) {
            onReadOBJFile(request.responseText, so, gl, scale, reverse);
        }
    }
    request.open('GET', so.objFilePath, true); // Create a request to acquire the file
    request.send();                      // Send the request
}

// OBJ File has been read
function onReadOBJFile(fileString, so, gl, scale, reverse) {
    var objDoc = new OBJDoc(so.filePath);  // Create a OBJDoc object
    objDoc.defaultColor = so.color;
    var result = objDoc.parse(fileString, scale, reverse); // Parse the file
    if (!result) {
        so.objDoc = null; so.drawingInfo = null;
        console.log("OBJ file parsing error.");
        return;
    }
    so.objDoc = objDoc;
}

// OBJ File has been read compreatly
function onReadComplete(gl, model, objDoc) {
    // Acquire the vertex coordinates and colors from OBJ file
    var drawingInfo = objDoc.getDrawingInfo();

    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, model.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, model.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.colors, gl.STATIC_DRAW);

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    return drawingInfo;
}

function initTextures(gl, obj) {
    var texture = gl.createTexture();   // Create a texture object
    if (!texture) {
        console.log('Failed to create the texture object');
        return null;
    }

    var image = new Image();  // Create a image object
    if (!image) {
        console.log('Failed to create the image object');
        return null;
    }
    // Register the event handler to be called when image loading is completed
    image.onload = function() {
        // Write the image data to texture object
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image Y coordinate
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        gl.bindTexture(gl.TEXTURE_2D, null); // Unbind texture
    };

    // Tell the browser to load an Image
    image.src = obj.texImagePath;

    return texture;
}

function drawTexCube(gl, program, o, texture) {

    gl.useProgram(program);   // Tell that this program object is used
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(program.u_Sampler, 0);
    // Assign the buffer objects and enable the assignment
    initAttributeVariable(gl, program.a_Position, o.vertexBuffer);  // Vertex coordinates
    initAttributeVariable(gl, program.a_Normal, o.normalBuffer);    // Normal
    initAttributeVariable(gl, program.a_TexCoord, o.texCoordBuffer);// Texture coordinates
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer); // Bind indices

    // Bind texture object to texture unit 0
    
    drawCube(gl, program, o); // Draw
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}

// Coordinate transformation matrix
var g_modelMatrix = new Matrix4();
var g_viewMatrix = new Matrix4();
var g_projMatrix = new Matrix4();
var g_mvpMatrix = new Matrix4();
var g_normalMatrix = new Matrix4();

function drawSolidCube(gl, program, angle) {

    g_viewMatrix.setLookAt(eye.elements[0],eye.elements[1],eye.elements[2],
        at.elements[0],at.elements[1],at.elements[2],
        up.elements[0],up.elements[1],up.elements[2]
    );
    g_projMatrix.setPerspective(CameraPara.fov, 1, CameraPara.near, CameraPara.far);

    gl.useProgram(program);
    gl.uniform3f(program.u_DirectionLight, sceneDirectionLight[0], sceneDirectionLight[1], sceneDirectionLight[2]);

    for(var i=0;i<SceneObjectList.length; i++) {
        var so = SceneObjectList[i];
        if (so.objDoc != null && so.objDoc.isMTLComplete()) { // OBJ and all MTLs are available
            so.drawingInfo = onReadComplete(gl, so.model, so.objDoc);
            SceneObjectList[i].objname = so.objDoc.objects[0].name;
            so.objname = so.objDoc.objects[0].name;
            so.objDoc = null;
        }
        if (so.drawingInfo) {
            g_modelMatrix.setIdentity();

            for (var j=0; j<so.transform.length; j++) {
                if (so.transform[j].type=="translate")
                    g_modelMatrix.translate(so.transform[j].content[0],so.transform[j].content[1],so.transform[j].content[2]);
                else if (so.transform[j].type=="scale")
                    g_modelMatrix.scale(so.transform[j].content[0],so.transform[j].content[1],so.transform[j].content[2]);
                else
                    g_modelMatrix.rotate(so.transform[j].content[0],so.transform[j].content[1],so.transform[j].content[2],so.transform[j].content[3]);
            }
            if (so.objname == "gumby") {
                g_modelMatrix.rotate(angle,0,1,0);
            }

            g_mvpMatrix.set(g_projMatrix).multiply(g_viewMatrix).multiply(g_modelMatrix);
            gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

            g_normalMatrix.setInverseOf(g_modelMatrix);
            g_normalMatrix.transpose();
            gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

            initAttributeVariable(gl, program.a_Position, so.model.vertexBuffer);  // Vertex coordinates
            initAttributeVariable(gl, program.a_Normal, so.model.normalBuffer);    // Normal
            initAttributeVariable(gl, program.a_Color, so.model.colorBuffer);// Texture coordinates

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, so.model.indexBuffer);
            // Draw
            gl.drawElements(gl.TRIANGLES, so.drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
        }
    }
}

function drawCube(gl, program, o) {
    // Calculate a model matrix
    g_modelMatrix.setTranslate(o.translate[0],o.translate[1],o.translate[2]);
    g_modelMatrix.scale(o.scale[0],o.scale[1],o.scale[2]);

    g_viewMatrix.setLookAt(eye.elements[0], eye.elements[1], eye.elements[2], at.elements[0], at.elements[1], at.elements[2], up.elements[0], up.elements[1], up.elements[2]);
    g_projMatrix.setPerspective(CameraPara.fov, 1, CameraPara.near, CameraPara.far);
    
    // Calculate transformation matrix for normals and pass it to u_NormalMatrix
    g_normalMatrix.setInverseOf(g_modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

    // Calculate model view projection matrix and pass it to u_MvpMatrix
    g_mvpMatrix.set(g_projMatrix).multiply(g_viewMatrix).multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);   // Draw
}

function initArrayBufferForLaterUse(gl, data, num, type) {
    var buffer = gl.createBuffer();   // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    // Keep the information necessary to assign to the attribute variable later
    buffer.num = num;
    buffer.type = type;

    return buffer;
}

function initElementArrayBufferForLaterUse(gl, data, type) {
    var buffer = gl.createBuffer();　  // Create a buffer object
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;

    return buffer;
}

var ANGLE_STEP = 30;   // The increments of rotation angle (degrees)

var last = Date.now(); // Last time that this function was called
function animate(angle) {
    var now = Date.now();   // Calculate the elapsed time
    var elapsed = now - last;
    last = now;
    // Update the current rotation angle (adjusted by the elapsed time)
    var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle % 360;
}
