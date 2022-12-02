const video = document.getElementById('video');
const lista = document.getElementById('lista');
let li;
const MODEL_URL = './models';

// Se cargan los modelos de la api faceapi
Promise.all([

  // faceapi.loadSsdMobilenetv1Model(MODEL_URL),
  faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
  

]).then(startVideo)

// Funcion para iniciar el video via webcam en el documento
async function startVideo() {

    li = document.createElement("li");
    li.innerHTML = 'Modelos Cargados.';
    lista.append(li);
    console.log('Models Loaded');

    navigator.getUserMedia = (navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia
    );

    navigator.getUserMedia(
        { video: {} },
        stream => {
        video.srcObject = stream
        },
        err => console.error(err)
    );

    recognizeFaces();
}

// Funcion para iniciar el proceso de reconocimiento facial
async function recognizeFaces(){

    // Se llama a la funcion que guarda y retorna la informacion de los rostros a reconocer, en un array con los nombres
    const labeledFaceDescriptors = await loadLabeledImages();

    console.log(labeledFaceDescriptors);

    // Indice a utilizar en el proceso de reconocimiento, mientras mayor sea el numero, menos preciso es le reconocimiento y confunde con otros rostros; si es menor el numero, no reconoce ni al rostro registrado. El indice ideal es entre 4 y 6.
    const threshold = 0.5;

    // Se usa el metodo facematcher de la api para almcenar los reconocimientos faciales, se pasan por parametro los datos recolectados de los rostroa a reconocer, y el indice de parecision
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, threshold);

    // Se inicia el video
    video.play();
    
    video.addEventListener('play', async () => {

        console.log('Playing');

        // Se crea y se agrega el canvas para el video
        const canvas = faceapi.createCanvasFromMedia(video);
        document.body.append(canvas);

        const button = document.createElement('button');
        document.body.append(button);

        // DisplaySize toma las dimensiones del video
        const displaySize = { width: video.width, height: video.height }

        // MatchDimensions ajusta dinamicamente el canvas a la medida segun las dimensiones del video
        faceapi.matchDimensions(canvas, displaySize);

        button.innerHTML = 'Detectar';

        // Se utiliza un boton para iniciar la funcion de reconocimiento 
        button.addEventListener('click', async () => {

            setInterval(async () => {
                
                // Se guardan los rostros detectados en la camara
                const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors()
    
                // Se procesan los datos de los rostros detectados junto con las dimensiones del video para efectos del funcinamiento del api
                const resizedDetections = faceapi.resizeResults(detections, displaySize)
    
                // Se redibuja el canvas dinamicamente
                canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    
                // Se guarda en un array los resultados de las coincidencias entre los rostros guardados y los que se estan registrando en camara
                const results = resizedDetections.map((d) => {
                    return faceMatcher.findBestMatch(d.descriptor)
                });

                // Para cada rostro registrado en camara se dibuja el canvas junto con el nombre del rostro reconocido 
                results.forEach( (result, i) => {
                    const box = resizedDetections[i].detection.box
                    const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() })
                    drawBox.draw(canvas)
                })
            }, 100)


        })


    });




}

function loadLabeledImages() {
    
    // El array con las etiquetas de los rostros a reconocer (guardados en la carpeta 'images', cada uno con su respectiva etiqueta de identificacion como nombre)
    const labels =['ross', 'rachel', 'chandler', 'monica', 'phoebe', 'kanye', 'joey', 'Salvador', 'Albert'];

    // Se recorre el array de las etiquetas y se compara cada etiqueta con el nombre identificativo de cada imagen de rostro
    return Promise.all(

        labels.map(async label => {

            const imgUrl = `./images/${label}.jpg`;
            const img = await faceapi.fetchImage(imgUrl);
            
            // Se guarda la informacion detectada en el rostro de la imagen
            const faceDescription = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            
            if (!faceDescription) {

            throw new Error(`no faces detected for ${label}`);

            }
            
            console.log(label + JSON.stringify(faceDescription));
            
            const faceDescriptors = [faceDescription.descriptor];

            li = document.createElement("li");
            li.innerHTML = label + ' Rostro Cargado  ';
            lista.append(li);
            console.log(label + ' Faces Loaded | ');

            // Se retorna la informacion de cada rostro para poder compararse en el reconocimiento a traves de la camara
            return new faceapi.LabeledFaceDescriptors(label, faceDescriptors);

        })
    );

};



 