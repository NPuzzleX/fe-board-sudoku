<script lang="ts">
  import { onMount } from "svelte";
  import { loadState, getPuzzle, postAnswer } from "../helper/backend";
  import * as iconList from "../helper/iconList";

  //------------- SCRIBBLE BOARD CONTROL -------------
  let CV: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D
  let mainDiv: HTMLDivElement;

  let isMouseDown: boolean = false;
  let isScrolled:boolean = false;

  let pointSize: number = 2;
  $: intervalSize = Math.floor(pointSize*1.3);

  let brushColour: string = '#000000';
  let posX: number = 0;
  let posY: number = 0;
  let writeMode: number = 2;
  /*
    0 : erase
    1 : write
    2 : move
  */
  $: cursorType = (writeMode == 0) ? "" : ((writeMode == 1) ? "" : "grab")

  let originalHeight = 1200;
  let originalWidth = 1200;
  let scaling = 1;
  let zoomFactor = 1;

  let cellFontSize = 12;
  $: {
    cellFontSize = (originalHeight > originalWidth ? (originalHeight * scaling/rowNum) : (originalWidth * scaling/colNum))/2;
  }

  let mainAreaHeight: number;
  let mainAreaWidth: number;
  let optionHeight: number;
  let fitPage:boolean = true;
  let optionHidden: boolean = false;

  $: isOverflowWidth = fitPage ? false : (!mainDiv ? false : (mainDiv.clientWidth < originalWidth*scaling));
  $: isOverflowheight = fitPage ? false : (!mainDiv ? false : (mainDiv.clientHeight < originalHeight*scaling));

  $: {
    if (fitPage) {
      if ((mainAreaWidth)/colNum > (mainAreaHeight - (optionHidden ? 0 : optionHeight))/rowNum) {
        zoomFactor = (mainAreaHeight - (optionHidden ? 0 : optionHeight))/mainAreaHeight;
        scaling = mainAreaHeight/originalHeight*zoomFactor;
      } else {
        zoomFactor = (mainAreaWidth)/mainAreaWidth;
        scaling = mainAreaWidth/originalWidth*zoomFactor;
      }
      cellFontSize = (originalHeight > originalWidth ? (originalHeight * scaling/rowNum) : (originalWidth * scaling/colNum))/2;
    } else {
      if (zoomFactor <= 0) {
        zoomFactor = 1;
      }

      if ((mainAreaWidth - 15)/colNum > (mainAreaHeight - 15)/rowNum) {
        scaling = mainAreaHeight/originalHeight*zoomFactor;
      } else {
        scaling = mainAreaWidth/originalWidth*zoomFactor;
      }
      cellFontSize = (originalHeight > originalWidth ? (originalHeight * scaling/rowNum) : (originalWidth * scaling/colNum))/2;
    }
  }

  let scribbleBoard: boolean = false;

  let isPenDown: boolean = false;
  let ongoingTouches = [];

  let originalBoard: any = undefined;

  function eraserBtn() {
    writeMode = 0;
    pointSize *= 25;
  }

  function writeBtn(bColour: string) {
    if (bColour != "") {
      brushColour = bColour;
    }
    pointSize = 2;
    writeMode = 1;
  }


  function mouseMove(e: MouseEvent) {
    if (isMouseDown) {
      e.preventDefault();
      const newX = (e.clientX - CV.getBoundingClientRect().left)/scaling;
      const newY = (e.clientY - CV.getBoundingClientRect().top)/scaling;

      if (writeMode == 0) {
        if ((posX > 0) && (posY > 0)) {
          const dotCount = Math.floor(Math.sqrt(Math.pow(newX - posX, 2) + Math.pow(newY - posY, 2))/intervalSize);
          if (dotCount > 0) {
            const xInterval = (newX - posX)/dotCount;
            const yInterval = (newY - posY)/dotCount;
            for (let i = 0; i < dotCount; i++) {
              ctx.clearRect(posX + xInterval*i - pointSize*0.5, posY + yInterval*i - pointSize*0.5, pointSize, pointSize);
            }
          }
        }

        posX = newX;
        posY = newY;
        ctx.clearRect(posX - pointSize*0.5, posY - pointSize*0.5, pointSize, pointSize);
      } else if (writeMode == 1) {
        if ((posX > 0) && (posY > 0)) {
          const dotCount = Math.floor(Math.sqrt(Math.pow(newX - posX, 2) + Math.pow(newY - posY, 2))/intervalSize);
          if (dotCount > 0) {
            const xInterval = (newX - posX)/dotCount;
            const yInterval = (newY - posY)/dotCount;
            for (let i = 0; i < dotCount; i++) {
              drawDot(posX + xInterval*i, posY + yInterval*i);
            }
          }
        }

        posX = newX;
        posY = newY;
        drawDot(posX, posY);
      } else if (writeMode == 2) {
        mainDiv.scrollTop = mainDiv.scrollTop - e.movementY;
        mainDiv.scrollLeft = mainDiv.scrollLeft - e.movementX;
      }
    }
  }

  function mouseDown(e: MouseEvent) {
    isMouseDown = true;
    posX = (e.clientX - CV.getBoundingClientRect().left)/scaling;
    posY = (e.clientY - CV.getBoundingClientRect().top)/scaling;
  }

  function mouseUp() {
    if (isMouseDown) {
      isMouseDown = false;
      saveStorageScribble();
      posX = -1;
      posY = -1;
    }
  }

  function mouseLeave () {
    if (isMouseDown) {
      isMouseDown = false;
      saveStorageScribble();
      posX = -1;
      posY = -1;
    }
  }

  function pointerDown(e: PointerEvent) {
    if (e.pointerType == "pen") {
      isPenDown = true;
    }
  }

  function touchStart (e: TouchEvent) {
    if ((writeMode != 2) || (isPenDown)) {
      const touches = e.changedTouches;

      for (let i = 0; i < touches.length; i++) {
        ongoingTouches.push(copyTouch(touches[i]));
      }      
    }
  }

  function touchMove(e: TouchEvent) {
    if ((writeMode != 2) || (isPenDown)) {
      e.preventDefault();
      const touches = e.changedTouches;

      for (let i = 0; i < touches.length; i++) {
        const idx = ongoingTouchIndexById(touches[i].identifier);

        if (idx >= 0) {
          const newX = (touches[i].clientX - CV.getBoundingClientRect().left)/scaling;
          const newY = (touches[i].clientY - CV.getBoundingClientRect().top)/scaling;

          if (writeMode == 0) {
            if ((ongoingTouches[idx].x > 0) && (ongoingTouches[idx].y > 0)) {
              const dotCount = Math.floor(Math.sqrt(Math.pow(newX - ongoingTouches[idx].x, 2) + Math.pow(newY - ongoingTouches[idx].y, 2))/intervalSize);
              if (dotCount > 0) {
                const xInterval = (newX - ongoingTouches[idx].x)/dotCount;
                const yInterval = (newY - ongoingTouches[idx].y)/dotCount;
                for (let i = 0; i < dotCount; i++) {
                  ctx.clearRect(ongoingTouches[idx].x + xInterval*i - pointSize*0.5, ongoingTouches[idx].y + yInterval*i - pointSize*0.5, pointSize, pointSize);
                }
              }
            }

            ctx.clearRect(ongoingTouches[idx].x - pointSize*0.5, ongoingTouches[idx].y - pointSize*0.5, pointSize, pointSize);
          } else {
            if ((ongoingTouches[idx].x > 0) && (ongoingTouches[idx].y > 0)) {
              const dotCount = Math.floor(Math.sqrt(Math.pow(newX - ongoingTouches[idx].x, 2) + Math.pow(newY - ongoingTouches[idx].y, 2))/intervalSize);
              if (dotCount > 0) {
                const xInterval = (newX - ongoingTouches[idx].x)/dotCount;
                const yInterval = (newY - ongoingTouches[idx].y)/dotCount;
                for (let i = 0; i < dotCount; i++) {
                  drawDot(ongoingTouches[idx].x + xInterval*i, ongoingTouches[idx].y + yInterval*i);
                }
              }
            }

            drawDot(ongoingTouches[idx].x, ongoingTouches[idx].y);
          }

          ongoingTouches.splice(idx, 1, copyTouch(touches[i])); 
        }
      }
    }    
  }

  function touchEnd(e: TouchEvent) {
    if ((writeMode != 2) || (isPenDown)) {
      
      ongoingTouches.splice(0, ongoingTouches.length);

      if (isPenDown) {
        isPenDown = false;
      }
    }
  }

  function touchCancel(e: TouchEvent) {
    if ((writeMode != 2) || (isPenDown)) {
      e.preventDefault();
      ongoingTouches.splice(0, ongoingTouches.length);

      if (isPenDown) {
        isPenDown = false;
      }

      saveStorageScribble();
    }
  }

  function copyTouch({ identifier, clientX, clientY }) {
    return {
      id: identifier, 
      x: (clientX - CV.getBoundingClientRect().left)/scaling, 
      y: (clientY - CV.getBoundingClientRect().top)/scaling 
    };
  }

  function ongoingTouchIndexById(idToFind) {
    for (let i = 0; i < ongoingTouches.length; i++) {
      const id = ongoingTouches[i].id;

      if (id === idToFind) {
        return i;
      }
    }
    return -1;
  }

  function drawDot(x: number, y: number) {
    ctx.fillStyle = brushColour;
    ctx.beginPath();
    ctx.arc(x - pointSize*0.5, y - pointSize*0.5, pointSize, 0, 2 * Math.PI);
    ctx.fill();
  }

  function mouseMoveMain(e: MouseEvent) {
    if (isMouseDown) {
      e.preventDefault();

      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)  {
        mainDiv.scrollTop = mainDiv.scrollTop - e.movementY;
        mainDiv.scrollLeft = mainDiv.scrollLeft - e.movementX;
      }
    }
  }

  function mouseDownMain(e: MouseEvent) {
    isMouseDown = true;
  }

  function mouseUpMain() {
    if (isMouseDown) {
      isMouseDown = false;
    }
  }

  function mouseLeaveMain () {
    if (isMouseDown) {
      isMouseDown = false;
    }
    isScrolled = false;
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, originalHeight, originalWidth);
    saveStorageScribble();
  }

  function checkTouchscreen(): boolean {
    if ("maxTouchPoints" in navigator) {
      return (navigator.maxTouchPoints > 0);
    } else if ("msMaxTouchPoints" in navigator) {
      //@ts-ignore
      return (navigator.msMaxTouchPoints > 0);
    } else {
      const mQ = matchMedia?.("(pointer:coarse)");
      if (mQ?.media === "(pointer:coarse)") {
        return (!!mQ.matches);
      } else if ("orientation" in window) {
        return (true);
      } else {
        //@ts-ignore
        const UA = navigator.userAgent;
        return (
          /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
          /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
        );
      }
    }
  }

  onMount(async () => {
    const target = document.getElementById("optionBoard");

    const observer = new MutationObserver(e => {
      if (e[0].attributeName == "style") {
        if (e[0].target.firstChild.parentElement.style.display == "none") {
          optionHidden = true;
        } else {
          optionHidden = false;
        }
      }
		})

	  observer.observe(target, { attributeFilter: ["style"] });

    if (!sessionStorage.getItem("PuzzleId")) {
      console.log("INVALID PUZZLE_ID");
      window.postMessage("INVALID PUZZLE_ID", window.origin);
      return;
    }

    const tempData = await getPuzzle();
    if (!tempData) {
      console.log("INVALID PUZZLE_ID");
      //window.postMessage("INVALID PUZZLE_ID", window.origin);
      return;
    }

    if (tempData.type != "Sudoku") {
      console.log("INVALID PUZZLE_ID");
      //window.postMessage("INVALID PUZZLE_ID", window.origin);
      return;
    }

    try {
      ptype = tempData.type;
      originalBoard = JSON.parse(JSON.stringify(tempData.data));
      Val = tempData.data.map((e: string[]) => {
        return (e.map(e2 => {
          let a: boardData = {
            v: e2,
            w: false,
            f: (e2 != "")
          }
          return (a);
        }))
      });

    } catch (error) {
      console.log("INVALID PUZZLE_ID");
      window.postMessage("INVALID PUZZLE_ID", window.origin);
    }
    
    sizeBox = Math.round(Math.sqrt(Val.length));

    let ctxCont = CV.getContext("2d");
    if (ctxCont) {
      ctx = ctxCont;
    }

    CV.height = originalHeight;
    CV.width = originalWidth;

    scribbleBoard = checkTouchscreen();

    load();
  });

  //------------- PLAY BOARD -------------
  type boardData = {
    v: string
    w: boolean // confirmed wrong
    f: boolean // fixed
  }

  let sizeBox : number = 3;
  let colNum = sizeBox*sizeBox;
  let rowNum = sizeBox*sizeBox;

  $: {
    if (sizeBox < 3) {
      sizeBox = 3;
    } else if (sizeBox > 7) {
      sizeBox = 7;
    }   

    colNum = sizeBox*sizeBox;
    rowNum = sizeBox*sizeBox;

    originalWidth = 3600/49*sizeBox*sizeBox;
    originalHeight = 3600/49*sizeBox*sizeBox;
  }


  let Val: boardData[][] = [];
  let ptype: string = "";

  function doubleClickMouse(e: MouseEvent) {
    document.elementsFromPoint(e.clientX, e.clientY).forEach(e2 => {
      if (e2.className.indexOf("boardCell") == 0) {
        mainPanelClick(e2 as HTMLElement);
      }
    })
  }

  function mainPanelClick(e: HTMLElement) {
    if (isScrolled) {
      isScrolled = false;
      return;
    }

    e.focus();
  }

  function validateInput(i: number, j: number) {
    let check = parseInt(Val[i][j].v);

    if (isNaN(check)) {
      Val[i][j].v = "";
    } else if (check > sizeBox*sizeBox) {
      Val[i][j].v = "";
    } else if (check < 1) {
      Val[i][j].v = "";
    } else {
      Val[i][j].v = check.toString();
    }
    saveStorageState();
  }

  function selectAllText(e: Event) {
    window.getSelection().selectAllChildren((e.target as Element))
  }

  function forceRefresh() {
    Val = Val;
  }

  //------------- SAVE LOAD STATE -------------
  let processing: boolean = false;

  function load() {
    if (!processing) {
      processing = true;
      loadState().then((e) => {
        if (!e) {
          console.log("NO DATA");
          processing = false;
          saveStorageState();
          sessionStorage.setItem("TEMPSCRIBBLE", CV.toDataURL("image/webp", 0.5));
        } else {
          clearCanvas();
          var image = new Image();
          image.onload = function() {
              ctx.drawImage(image, 0, 0);
          };
          image.src = e["cvs"];
          
          for (let i = 0; i < e["game"].length; i++) {
            for (let j = 0; j < e["game"][i].length; j++){
              Val[i][j].v = e["game"][i][j];
            }
          }

          forceRefresh();

          saveStorageState();
          sessionStorage.setItem("TEMPSCRIBBLE", e["cvs"]);

          processing = false;       
        }
      }).catch(err => {
        console.log("ERROR LOADING" + err);
        processing = false;
      })
    }
  }

  function resetState() {
    if (scribbleBoard) {
      clearCanvas();
    }
    
    Val = originalBoard.map((e: string[]) => {
      return (e.map(e2 => {
        let a: boardData = {
          v: e2,
          w: false,
          f: (e2 != "")
        }
        return (a);
      }))
    });

    saveStorageState();
  }

  function saveStorageState() {
    sessionStorage.setItem("TEMPSTATE", JSON.stringify(Val.map(e => {
      return (e.map(e2 => {
        return e2.v;
      }));
    })));
    sessionStorage.setItem("save", "Y");
  }

  function saveStorageScribble() {
    sessionStorage.setItem("TEMPSCRIBBLE", CV.toDataURL("image/webp", 0.5));
    sessionStorage.setItem("save", "Y");
  }

  //------------- CHECK ANSWER -------------
  let checking: boolean = false;
  function checkAnswer() {
    if (!checking) {
      checking = true;
      let clear = true;

      // Vertical Checking
      for (let i = 0; i < Val.length; i++) {
        for (let j = 0; j < Val[i].length; j++) {
          if (Val[i][j].v != "") {
            let nOccur : number = 0;
            for (let k = 0; k < Val[i].length; k++) {
              if (Val[i][j].v == Val[i][k].v) {
                nOccur++;
              }
            }
            if (nOccur > 1) {
              clear = false;
              for (let k = 0; k < Val[i].length; k++) {
                if (Val[i][j].v == Val[i][k].v) {
                  Val[i][k].w = true;
                  nOccur--;
                }
                if (nOccur == 0) {
                  break;
                }
              }
            }
          } else {
            clear = false;
            Val[i][j].w = true;
          }
        }
      }

      // Horizontal Checking
      for (let i = 0; i < Val.length; i++) {
        for (let j = 0; j < Val[i].length; j++) {
          if (Val[i][j].v != "") {
            let nOccur : number = 0;
            for (let k = 0; k < Val.length; k++) {
              if (Val[i][j].v == Val[k][j].v) {
                nOccur++;
              }
            }
            if (nOccur > 1) {
              clear = false;
              for (let k = 0; k < Val.length; k++) {
                if (Val[i][j].v == Val[k][j].v) {
                  Val[k][j].w = true;
                  nOccur--;
                }
                if (nOccur == 0) {
                  break;
                }
              }
            }
          } else {
            clear = false;
            Val[i][j].w = true;
          }
        }
      }

      // Box checking
      for (let i = 0; i < Val.length; i++) {
        for (let j = 0; j < Val[i].length; j++) {
          if (Val[i][j].v != "") {
            let nOccur : number = 0;
            let xBox: number = Math.floor(i/sizeBox);
            let yBox: number = Math.floor(j/sizeBox);

            for (let k = 0; k < sizeBox; k++) {
              for (let l = 0; l < sizeBox; l++) {
                if (Val[i][j].v == Val[k + xBox*sizeBox][l + yBox*sizeBox].v) {
                  nOccur++;
                }
              }
            }

            if (nOccur > 1) {
              clear = false;
              for (let k = 0; k < sizeBox; k++) {
                for (let l = 0; l < sizeBox; l++) {
                  if (Val[i][j].v == Val[k + xBox*sizeBox][l + yBox*sizeBox].v) {
                    Val[k + xBox*sizeBox][l + yBox*sizeBox].w = true;
                    nOccur--;
                  }
                  if (nOccur == 0) {
                    break;
                  }
                }
              }
            }
          } else {
            clear = false;
            Val[i][j].w = true;
          }
        }
      }

      if (!clear) {
        setTimeout(() => {
          checking = false;
          for (let i = 0; i < Val.length; i++) {
            for (let j = 0; j < Val.length; j++) {
              Val[i][j].w = false;
            }
          }
        }, 2000);
      } else {
        postAnswer(Val.map(e => {
          return (e.map(e2 => {
            return parseInt(e2.v);
          }));
        }), ptype).then(e => {
          if (e.resStatus == 200) {
            if (e.res) {
              console.log("PUZZLE DONE!");
              window.postMessage("PUZZLE DONE!", window.origin);
            } else {
              console.log("BACKEND CHECKING ANSWER: WRONG");
              window.postMessage("BACKEND CHECKING ANSWER: WRONG", window.origin);
              checking = false;
            }
          } else {
            console.log("ERROR CHECKING ANSWER");
            window.postMessage("ERROR CHECKING ANSWER", window.origin);
            checking = false;
          }
        }).catch(err => {
          console.log("ERROR CHECKING ANSWER " + err);
          window.postMessage("ERROR CHECKING ANSWER", window.origin);
          checking = false;
        })
      }
    }
  }
</script>

<div id="mainArea" bind:clientWidth={mainAreaWidth} bind:clientHeight={mainAreaHeight}>
  <div id="optionBoard" bind:clientHeight={optionHeight}>
      <div class="optionH">
        <div class="option" style="display: { scribbleBoard ? "flex" : "none" }; padding-right: 5px; border-right: solid 3px black">
          <div class="palette">
            <button style="background-color:#000000" on:click={() => {writeBtn("#000000");}}/>
            <button style="background-color:#d00404" on:click={() => {writeBtn("#d00404");}}/>
          </div>
          <div class="palette">
            <button style="background-color:#00bcc0" on:click={() => {writeBtn("#00bcc0");}}/>
            <button style="background-color:#32cd32" on:click={() => {writeBtn("#32cd32");}}/>
          </div>
          <button disabled={writeMode == 0} on:click={eraserBtn} title="Erase"><div class="icon">{@html iconList.eraserIco}</div><p>Eraser</p></button>
          <button disabled={writeMode == 2} on:click={() => {writeMode = 2}} title="Move" ><div class="icon">{@html iconList.arrowMoveIco}</div><p>Move</p></button>
          <button on:click={clearCanvas} title="Clear"><div class="icon newIcon">{@html iconList.newIco}</div><p>Clear</p></button>
        </div>
        <div class="option">
          <div class="option" style="position: relative; top: -0.2em;">
            <input type=checkbox bind:checked={scribbleBoard}>
            <div style="flex-direction: column; display: flex; align-items: center">
              <div class="icon boardIcon" style="margin-bottom: 10px;">{@html iconList.boardIco}</div>
              <p>Scribble Board</p>
            </div>            
          </div>
          <button on:click={resetState} title="Reset"><div class="icon">{@html iconList.arrowRotateIco}</div><p>Reset</p></button>
          <button on:click={checkAnswer} title="Check Answer"><div class="icon">{@html iconList.checkSolidIco}</div><p>Check</p></button>
        </div>
        <div class="option" style="padding-left: 5px; border-left: solid 3px black">
          <button on:click={() => {zoomFactor >= 2 ? zoomFactor-- : zoomFactor /= 2; fitPage = false;}} title="Zoom out"><div class="icon">{@html iconList.magMinIco}</div><p>Zoom Out</p></button>
          <input type=number on:input={() => {fitPage = false;}} style="width: 4em;" bind:value={zoomFactor} min="0">
          <button on:click={() => {zoomFactor >= 1 ? zoomFactor++ : zoomFactor *= 2; fitPage = false;}} title="Zoom in"><div class="icon">{@html iconList.magPlusIco}</div><p>Zoom In</p></button>
          <button on:click={() => {fitPage = true;}} title="Fit to page"><div class="icon">{@html iconList.maxIco}</div><p>Fit Page</p></button>
          <button on:click={() => {window.postMessage("TRIGGER FULLSCREEN", window.origin);}} title="Full Screen"><div class="icon">{@html iconList.enlargeIco}</div><p>Full Screen</p></button>
        </div>
      </div>
      {#if scribbleBoard}
        <div class="option">
          <h3>double click to edit number</h3>
        </div> 
      {/if}  
  </div>
  <div id="boardContainer" bind:this={mainDiv} 
    on:scroll={() => {isScrolled = true;}}
    style="display: {isOverflowWidth ? "unset" : "flex"}; padding-left: { (isOverflowWidth ? 20 : 0)}px; padding-top: { (isOverflowheight ? 20 : 0)}px; overflow: {fitPage ? "hidden" : "scroll"};"
  >
    <div id="boardArea" style="height: {originalHeight*scaling + (isOverflowheight ? 20 : 0)}px; width: {originalWidth*scaling + (isOverflowWidth ? 20 : 0)}px;">
      <canvas 
          style="display: { scribbleBoard ? "initial" : "none" }; height: {originalHeight*scaling}px; width: {originalWidth*scaling}px; z-index: 2; opacity: 1.0; cursor: { cursorType };"
          
          bind:this={CV}
          on:mousemove={mouseMove}
          on:mouseup={mouseUp}
          on:mousedown={mouseDown}
          on:mouseleave={mouseLeave}
          on:touchstart={touchStart}
          on:touchmove={touchMove}
          on:touchend={touchEnd}
          on:touchcancel={touchCancel}
          on:pointerdown={pointerDown}
          on:dblclick={doubleClickMouse}
      ></canvas>           
      <div id="mainBoard"
        style="z-index: 1; opacity: 1.0; grid-template-columns: repeat({colNum}, 1fr); grid-template-rows: repeat({rowNum}, 1fr);height: {originalHeight*scaling}px; width: {originalWidth*scaling}px; font-size: {cellFontSize}px;"
        on:mousemove={mouseMoveMain}
        on:mouseup={mouseUpMain}
        on:mousedown={mouseDownMain}
        on:mouseleave={mouseLeaveMain}
      >
      {#each Val as box, j}
        {#each box as e, i}
          {#if e.f}
            <div id={i + " " + j} 
              class="boardCell"
              class:oddCell={!e.w && (((Math.floor(i/sizeBox) + Math.floor(j/sizeBox)) % 2) == 1)}
              class:wrong={e.w}
              class:fix={true}
              class:bl={i % sizeBox == 0} class:br={(i + 1) % sizeBox == 0}
              class:bt={j % sizeBox == 0} class:bb={(j + 1) % sizeBox == 0}
            >
              {e.v}
            </div>
          {:else}
            <div id={i + " " + j} 
              class="boardCell empty"
              class:oddCell={!e.w && (((Math.floor(i/sizeBox) + Math.floor(j/sizeBox)) % 2) == 1)}
              class:wrong={e.w}
              class:bl={i % sizeBox == 0} class:br={(i + 1) % sizeBox == 0}
              class:bt={j % sizeBox == 0} class:bb={(j + 1) % sizeBox == 0}
              on:focusout={() => {validateInput(j, i)}}
              on:focusin={(e2) => {selectAllText(e2)}}
              contenteditable = "true"
              bind:innerHTML={e.v}
            >
            </div>
          {/if}
        {/each}
      {/each}
      </div>
    </div>
  </div>
</div>

<style>
#mainArea {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

#boardContainer {
  justify-content: center;
}

/*   SCRIBBLE BOARD   */
canvas {
  position: absolute;
  top: 0px;
  left: 0px;
}

/*   MAIN PANEL   */
#mainBoard {
  position: absolute;
  top: 0px;
  left: 0px;
  display: grid;
  border-width: 5px;
  border-style: solid;
}

#boardArea {
  border-radius: 10px;
  position: relative;
  overflow: visible;
}

.boardCell {
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: inherit;
  border-width: 2px;
  border-style: solid;
}

.bl {
    border-left-width: 5px;
    border-left-style: solid;
}
  
.br {
    border-right-width: 5px;
    border-right-style: solid;
}
  
.bt {
    border-top-width: 5px;
    border-top-style: solid;
}
  
.bb {
    border-bottom-width: 5px;
    border-bottom-style: solid;
}

/*   MISC  */
#optionBoard {
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: sticky;
}

.optionH {
  display: flex;
  column-gap: 5px;
  align-items: baseline;
  justify-content: center;
}

.option {
  display: flex;
  column-gap: 5px;
  align-items: baseline;
  justify-content: center;
}

.option button[disabled] {
  cursor: not-allowed;
}

.option button {
  padding: 0.5em;
}

.palette {
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    height: 100%;
  }


/* SVG CONTROL */
button {
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 2px;
}
</style>