import React, { useEffect, useState } from 'react';
import './App.css';
import * as tmPose from '@teachablemachine/pose';

function App() {
  const audioTune = new Audio('sonido.mp3');

  let [model, setModel] = useState<tmPose.CustomPoseNet>();
  let [webcam, setWebcam] = useState<tmPose.Webcam>();
  var [predictions, setPredictions] = useState<{className: string; probability: number;}[]>();
  let [topPrediction, setTopPrediction] = useState<number>(0);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout>|null>(null);
  const [msgThreshold, setMsgThreshold] = useState<number>(3);

  const loadModel = async () => {
    const modelURL = 'https://storage.googleapis.com/tm-model/Ee38yDGdY/model.json';
    const metadataURL = 'https://storage.googleapis.com/tm-model/Ee38yDGdY/metadata.json';
    const ldmodel = await tmPose.load(modelURL, metadataURL);
    setModel(ldmodel);

    const wc = new tmPose.Webcam(200,200, true);
    await wc.setup();
    //wc.canvas.className = 'App-logo';
    setWebcam(wc);
    document.getElementById('Camera')?.appendChild(wc.canvas);

    /*const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2D');*/
  }

  const cameraLoop = async () => {
    webcam?.update();
    await predict();
    window.requestAnimationFrame(cameraLoop);
  }

  const predict = async () => {
    if(webcam && model){
    // Prediction #1: run input through posenet
    // estimatePose can take in an image, video or canvas html element
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    // Prediction 2: run input through teachable machine classification model
    const prediction = await model.predict(posenetOutput);

    //const pred = [];
    var maxPred = 0;

    for (let i = 0; i < 4; i++) {
        /*const classPrediction =
            prediction[i].className + ': ' + prediction[i].probability.toFixed(6);
        pred?.push(classPrediction);*/
        if(prediction[i].probability > prediction[maxPred].probability) maxPred = i;
    }

    setPredictions(prediction);
    setTopPrediction(maxPred);

    // finally draw the poses
    //drawPose(pose);
    }
  }

  /*function drawPose(pose: Pose) {
    console.log(pose);
    if(ctx && webcam){
      ctx.drawImage(webcam.canvas, 0, 0);
      // draw the keypoints and skeleton
      if (pose) {
          const minPartConfidence = 0.6;
          tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
          tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
      }
    }
  }*/

  useEffect(() => {
    audioTune.load();
    loadModel();
  }, []);

  useEffect(() => {
    webcam?.play();
    window.requestAnimationFrame(cameraLoop);
  }, [webcam]);

  useEffect(() => {
    if(predictions) {
      if(topPrediction!==0 && timeoutId==null){
        const tid = setTimeout(()=>{
          playSound();
          setMsgThreshold(msgThreshold-1);
        },3000);
        setTimeoutId(tid);
      }else if(topPrediction === 0 && timeoutId){
        clearTimeout(timeoutId);
        setTimeoutId(null);
        stopSound();
      }
    }
  }, [topPrediction]);

  useEffect(() => {
    if(msgThreshold===0){
      //->>Codigo de mensajes
      console.log('Aqui van los guasá >>>Rafiki');
      setMsgThreshold(3);
    }
  }, [msgThreshold]);

  const playSound = () => {
    audioTune.loop=true;
    audioTune.play();
  };

  const stopSound = () => {
    audioTune.pause();
    audioTune.currentTime = 0;
  };

  return (
    <div className="App" id="App">
      <div className="App-header">
        <a>Wea chida paquete titules 100/10</a>
        <div id="Camera"></div>
        <div className="Results-div" id="Results">
          <a>Top prediction: {predictions? predictions[topPrediction].className.toUpperCase():null}</a>
          <a>Centro: {predictions? predictions[0].probability.toFixed(6):null}</a>
          <a>Izquierda: {predictions? predictions[1].probability.toFixed(6):null}</a>
          <a>Derecha: {predictions? predictions[2].probability.toFixed(6):null}</a>
          <a>Abajo: {predictions? predictions[3].probability.toFixed(6):null}</a>
        </div>
      </div>
    </div>
  );
}

export default App;
