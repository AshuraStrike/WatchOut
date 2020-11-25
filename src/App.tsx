import React, { useEffect, useState } from 'react';
import './App.css';
import * as tmPose from '@teachablemachine/pose';
import Cookies from 'universal-cookie';
import w1 from './w1.png';
import w2 from './w2.png';
import { isGetAccessor, setTextRange } from 'typescript';

function App() {
  const [audioTune, setAudioTune] = useState<HTMLAudioElement>(new Audio('sonido.mp3'));

  let [model, setModel] = useState<tmPose.CustomPoseNet>();
  let [webcam, setWebcam] = useState<tmPose.Webcam>();
  var [predictions, setPredictions] = useState<{className: string; probability: number;}[]>();
  let [topPrediction, setTopPrediction] = useState<number>(0);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout>|null>(null);
  const [msgThreshold, setMsgThreshold] = useState<number>(3);
  const [logoVersion, setLogoVersion] = useState<boolean>(true);

  const [visualAlertId, setVisualAlertId] = useState<ReturnType<typeof setTimeout>|null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>('#282c34');

  const [persistentData, setPersistentData] = useState<Cookies>(new Cookies());

  const [inputText, setInputText] = useState<string>();
  const [inputNameText, setInputNameText] = useState<string>();
  const [showInputs, setShowInputs] = useState<boolean>(true);

  const loadModel = async () => {
    const modelURL = 'https://storage.googleapis.com/tm-model/Ee38yDGdY/model.json';
    const metadataURL = 'https://storage.googleapis.com/tm-model/Ee38yDGdY/metadata.json';
    const ldmodel = await tmPose.load(modelURL, metadataURL);
    setModel(ldmodel);

    const wc = new tmPose.Webcam(200,200, true);
    await wc.setup();
    wc.canvas.className = 'webcam';
    setWebcam(wc);
    document.getElementById('Camera')?.appendChild(wc.canvas);

    const phone = persistentData.get('cellNumber');
    if(phone !== undefined){
      setInputText(phone);
    }
    const name = persistentData.get('myName');
    if(name !== undefined){
      setInputNameText(name);
    }

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
          changeBackgroundColorLoop(backgroundColor);
        },3000);
        setTimeoutId(tid);
      }else if(topPrediction === 0 && timeoutId){
        clearTimeout(timeoutId);
        setTimeoutId(null);
        stopSound();
        if(visualAlertId)clearTimeout(visualAlertId);
        setBackgroundColor('#282c34');
        setLogoVersion(true);
      }
    }
  }, [topPrediction]);

  const changeBackgroundColorLoop = (bgColor: string) => {
    const tid = setTimeout(()=>{
      let c;
      if(bgColor=='red'){
        c='#282c34';
        setLogoVersion(true);
      }else{
        c='red';
        setLogoVersion(false);
      }
      setBackgroundColor(c);
      changeBackgroundColorLoop(c);
    },200);
    setVisualAlertId(tid);
  }

  useEffect(() => {
    if(msgThreshold===0){
      sendText();
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
    console.log('stopSound');
  };

  const sendText = () => {
    //pass text message GET variables via query string
    console.log(persistentData.get('cellNumber'));
    const number = persistentData.get('cellNumber');
    const myName = persistentData.get('myName');

    const mensaje: string = `Tu amigo ${myName} se está quedando dormido, llámalo`;

    fetch(`http://127.0.0.1:4000/send-text?recipient=${number}&textmessage=${mensaje}`)
    .catch(err => console.error(err))
  };

  const onClickHandler = () => {
    if(showInputs){
      persistentData.set('cellNumber',inputText,{path:'/'});
      persistentData.set('myName',inputNameText,{path:'/'});
    }
    setShowInputs(!showInputs);
  }

  const inputHandler = (event: any) => {
    const validNumber = parseInt(event.target.value).toString();
    if(validNumber!=='NaN'){
      setInputText(validNumber.toString());
    }else{
      setInputText('');
    }
  }

  const inputNameHandler = (e: any) => {
    setInputNameText(e.target.value);
  }

  return (
    <div className="App" id="App">
      <div className="App-header" style={{backgroundColor: backgroundColor}}>
        <img src={logoVersion?w1:w2} className="App-logo1"/>
        <div id="Camera"></div>
        <div className="Results-div" id="Results">
          <a>Focus-meter: {predictions? /*predictions[topPrediction].className.toUpperCase()*/null:null}</a>
          <div className='progress-bar'>
            {predictions?<div className='filler' style={{width: `${predictions[0].probability*100}%`}}></div>:null}
          </div>
          {showInputs?<input className='inputText' type='text' id='phoneNumber' onChange={inputHandler} value={inputText} maxLength={10} placeholder='Contact #'/>:null}
          {showInputs?<input className='inputText2' type='text' id='contactName' onChange={inputNameHandler} value={inputNameText} maxLength={15} placeholder='Your name'/>:null}
          <button className='submitButton' type='button' onClick={onClickHandler} >
            {showInputs?'Save Phone':'Set Phone'}
          </button>
          {/*<a>Centro: {predictions? predictions[0].probability.toFixed(6):null}</a>
          <a>Izquierda: {predictions? predictions[1].probability.toFixed(6):null}</a>
          <a>Derecha: {predictions? predictions[2].probability.toFixed(6):null}</a>
          <a>Abajo: {predictions? predictions[3].probability.toFixed(6):null}</a>*/}
        </div>
      </div>
    </div>
  );
}

export default App;
