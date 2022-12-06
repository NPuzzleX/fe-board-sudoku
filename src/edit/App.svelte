<script lang="ts">
  import { onMount } from "svelte";
  import { postPuzzle, getPuzzle } from "../helper/backend";
  import html2canvas from "html2canvas"
  import * as iconList from "../helper/iconList";

  let mainDiv: HTMLDivElement;
  let hidden: boolean = false;

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

  let isMouseDown:boolean = false;
  let isScrolled:boolean = false;

  function mouseMove(e: MouseEvent) {
    if (isMouseDown) {
      e.preventDefault();

      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 2)  {
        mainDiv.scrollTop = mainDiv.scrollTop - e.movementY;
        mainDiv.scrollLeft = mainDiv.scrollLeft - e.movementX;
      }
    }
  }

  function mouseDown(e: MouseEvent) {
    isMouseDown = true;
  }

  function mouseUp() {
    if (isMouseDown) {
      isMouseDown = false;
    }
  }

  function mouseLeave () {
    if (isMouseDown) {
      isMouseDown = false;
    }
    isScrolled = false;
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
      return;
    }

    const tempData = await getPuzzle();
    if (!tempData) {
      console.log("INVALID PUZZLE_ID");
      window.postMessage("INVALID PUZZLE_ID", window.origin);
    }

    try {
      Val = tempData.data.map((e: string[]) => {
        return (e.map(e2 => {
          let a: boardData = {
            v: e2,
            w: false
          }
          return (a);
        }))
      });
    } catch (error) {
      console.log("INVALID PUZZLE_ID");
      window.postMessage("INVALID PUZZLE_ID", window.origin);
    }
    
    colNum = Val.length;
    rowNum = Val[0].length;
    
  });

  //------------- PLAY BOARD -------------
  type boardData = {
    v: string
    w: boolean // confirmed wrong
  }

  let sizeBox : number = 3;
  let colNum = sizeBox*sizeBox;
  let rowNum = sizeBox*sizeBox;

  let Val: boardData[][] = [];

  while (Val.length < rowNum) {
    let a: boardData[] = [];
    while (a.length < colNum) {
      a.push({v: "", w: false});
    }
    Val.push(a);
  }

  $: {
    if (sizeBox > 10) {
      sizeBox = sizeBox % 10;
    }

    if (sizeBox < 3) {
      sizeBox = 3;
    } else if (sizeBox > 7) {
      sizeBox = 7;
    } else if (Math.round(sizeBox) != sizeBox) {
      sizeBox = Math.round(sizeBox);
    }    

    colNum = sizeBox*sizeBox;
    rowNum = sizeBox*sizeBox;

    changeSizeCheck();

    originalWidth = 3600/49*sizeBox*sizeBox;
    originalHeight = 3600/49*sizeBox*sizeBox;
  }

  function changeSizeCheck() {
    while (Val.length > rowNum) {
      Val.pop();
    }

    while (Val.length < rowNum) {
      let a: boardData[] = [];
      while (a.length < colNum) {
        a.push({v: "", w: false});
      }
      Val.push(a);
    }

    Val.forEach(e => {
      while (e.length > colNum) {
        e.pop();
      }

      while (e.length < colNum) {
        e.push({v: "", w: false});
      }
    })

    for (let i = 0; i < Val.length; i++) {
      for (let j = 0; j < Val[i].length; j++) {
        validateInput(i, j);
      }
    }
    forceRefresh();
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
  }

  function selectAllText(e: Event) {
    window.getSelection().selectAllChildren((e.target as Element))
  }


  function forceRefresh() {
    Val = Val;
  }

  function clearState() {
    for(let i = 0; i < Val.length; i++) {
      for(let j = 0; j < Val[i].length; j++) {
        Val[i][j].v = "";
        Val[i][j].w = false;
      }
    }
  }

  //------------- SAVING + THUMBNAIL GENERATOR -------------
  let thumbnailTarget: HTMLDivElement;
  const maxThumbnailSize: number = 400;
  let checking: boolean = false;

  async function check() {
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
        let renderedWidth = maxThumbnailSize;
        let renderedHeight = renderedWidth*originalHeight/originalWidth;

        if (renderedHeight > maxThumbnailSize) {
          renderedHeight = maxThumbnailSize;
          renderedWidth = renderedHeight*originalWidth/originalHeight;
        }

        let cvs = await html2canvas(thumbnailTarget, {
          scale: renderedWidth/thumbnailTarget.clientWidth
        });

        if (await postPuzzle({
          game: Val.map(e => {
            return e.map(e2 => {
              return e2.v;
            });
          }),
          thumbnail: cvs.toDataURL("image/webp", 0.5),
          },
          hidden)) {
          console.log("UPLAODED NEW PUZZLE");
          window.postMessage("UPLOADED NEW PUZZLE", window.origin);
        }
      }
    }
  }
</script>

<div id="mainArea" bind:clientWidth={mainAreaWidth} bind:clientHeight={mainAreaHeight}>
  <div id="optionBoard" bind:clientHeight={optionHeight}>
    <div class="optionH">
      <div class="option">
        <div class="icon">{@html iconList.sizeIco}</div>
        <input type=number style="width: 4em;" bind:value={sizeBox} min="3" max="7">
        <input type=checkbox bind:checked={hidden}>
        <div class="icon hiddenIcon">{@html iconList.hiddenIco}</div>Hidden
        <button on:click={clearState} title="Clear"><div class="icon newIcon">{@html iconList.newIco}</div><p>Clear</p></button>
        <button on:click={check} title="Save"><div class="icon">{@html iconList.saveIco}</div><p>Upload</p></button>
      </div>
      <div class="option" style="padding-left: 5px; border-left: solid 3px black">
        <button on:click={() => {zoomFactor >= 2 ? zoomFactor-- : zoomFactor /= 2; fitPage = false;}} title="Zoom out"><div class="icon">{@html iconList.magMinIco}</div><p>Zoom Out</p></button>
        <input type=number on:input={() => {fitPage = false;}} style="width: 4em;" bind:value={zoomFactor} min="0">
        <button on:click={() => {zoomFactor >= 1 ? zoomFactor++ : zoomFactor *= 2; fitPage = false;}} title="Zoom in"><div class="icon">{@html iconList.magPlusIco}</div><p>Zoom In</p></button>
        <button on:click={() => {fitPage = true;}} title="Fit to page"><div class="icon">{@html iconList.maxIco}</div><p>Fit Page</p></button>
        <button on:click={() => {window.postMessage("TRIGGER FULLSCREEN", window.origin);}} title="Full Screen"><div class="icon">{@html iconList.enlargeIco}</div><p>Full Screen</p></button>
      </div>
    </div>
  </div>  
  <div id="boardContainer" bind:this={mainDiv}
    on:scroll={() => {isScrolled = true;}}
    style="display: {isOverflowWidth ? "unset" : "flex"}; padding-left: { (isOverflowWidth ? 20 : 0)}px; padding-top: { (isOverflowheight ? 20 : 0)}px; overflow: {fitPage ? "hidden" : "scroll"};"
  >
    <div id="boardArea" bind:this={thumbnailTarget} style="height: {originalHeight*scaling + (isOverflowheight ? 20 : 0)}px; width: {originalWidth*scaling + (isOverflowWidth ? 20 : 0)}px;">
      <div id="mainBoard"
        style="z-index: 1; opacity: 1.0; grid-template-columns: repeat({colNum}, 1fr); grid-template-rows: repeat({rowNum}, 1fr); height: {originalHeight*scaling}px; width: {originalWidth*scaling}px; font-size: {cellFontSize}px;"
        on:mousemove={mouseMove}
        on:mouseup={mouseUp}
        on:mousedown={mouseDown}
        on:mouseleave={mouseLeave}
      >
      {#each Val as box, j}
        {#each box as e, i}
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

.option button {
  padding: 0.5em;
}

/* SVG CONTROL */
button {
  display: flex;
  flex-direction: column;
  align-items: center;
  row-gap: 2px;
}
</style>