const canvas = document.getElementById("canvas");
const palette = document.getElementById("palette");
const testBtn = document.getElementById("test-states");
let currentConnection = null;
const connections = [];
const transitionsList = [];
const stepsList = [];
let transitionCounter = 0;
let boxCounter = 0;

palette.querySelectorAll(".box").forEach(box => {
  box.addEventListener("dragstart", e => {
    // Centralizar cursor no centro do objeto na paleta usando setDragImage
    e.dataTransfer.setData("type", box.classList.contains("start_step") ? "start_step" : "active_step");

    // Clonar elemento para usar como drag image
    const clone = box.cloneNode(true);
    clone.style.position = "absolute";
    clone.style.top = "-1000px"; // fora da viewport
    clone.style.left = "-1000px";
    clone.style.pointerEvents = "none"; // não interfere
    document.body.appendChild(clone);

    const rect = clone.getBoundingClientRect();
    // Centralizar no meio
    const offsetX = rect.width / 2;
    const offsetY = rect.height / 2;

    e.dataTransfer.setDragImage(clone, offsetX, offsetY);

    // Remover clone após dragstart para não poluir o DOM
    setTimeout(() => document.body.removeChild(clone), 0);
  });
});

canvas.addEventListener("dragover", e => e.preventDefault());

canvas.addEventListener("drop", e => {
  e.preventDefault();
  const type = e.dataTransfer.getData("type");
  const template = palette.querySelector(`.${type}`);
  if (!template) return;

  const clone = template.cloneNode(true);
  clone.style.position = "absolute";
  clone.style.left = e.offsetX - 50 + "px";
  clone.style.top = e.offsetY - 45 + "px";
  clone.draggable = false;

  // Definir o state conforme o tipo
  const state = (type === "start_step") ? "active" : "inactive";
  clone.setAttribute("data-state", state);

  const inner = clone.querySelector(".inner-rect");
  if (state === "active") {
    inner.style.border = "4px double darkblue";
  }

  canvas.appendChild(clone);
  makeDraggable(clone);
  attachConnectorListeners(clone);
  attachHoverListeners(clone);
  attachRemoveListener(clone);
  renumberBoxes();

  const step = new Step(type, clone, state);
  step.id = ++boxCounter;
  stepsList.push(step);

  createTransitionForStep(step);  // <-- adiciona uma transition associada

  clone.setAttribute("data-id", step.id);

  printSteps();
});

function makeDraggable(box) {
  let startX, startY, boxStartLeft, boxStartTop;
  box.addEventListener("mousedown", e => {
    if (e.target.classList.contains("connector")) return;
    startX = e.clientX;
    startY = e.clientY;
    boxStartLeft = parseFloat(box.style.left);
    boxStartTop = parseFloat(box.style.top);

    function move(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      box.style.left = boxStartLeft + dx + "px";
      box.style.top = boxStartTop + dy + "px";
      updateConnections(box);
    }

    function up() {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  });
}

function attachConnectorListeners(box) {
  box.querySelectorAll(".connector").forEach(connector => {
    connector.addEventListener("click", e => {
      e.stopPropagation();
      const svg = getOrCreateSVG();
      const rect = canvas.getBoundingClientRect();
      const connRect = connector.getBoundingClientRect();
      const x = connRect.left + connRect.width / 2 - rect.left;
      const y = connector.classList.contains("top") ? connRect.top - rect.top : connRect.bottom - rect.top;

      if (!currentConnection) {
        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("stroke", "lightblue");
        polyline.setAttribute("stroke-width", "2");
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("points", `${x},${y}`);
        svg.appendChild(polyline);

        polyline.addEventListener("mouseenter", () => {
          polyline.classList.add("hover-highlight");
          const conn = connections.find(c => c.polyline === polyline);
          if (conn) {
            conn.from.box.querySelector(".inner-rect").classList.add("hover-highlight");
            conn.to?.box?.querySelector(".inner-rect")?.classList.add("hover-highlight");
          }
        });
        polyline.addEventListener("mouseleave", () => {
          polyline.classList.remove("hover-highlight");
          const conn = connections.find(c => c.polyline === polyline);
          if (conn) {
            conn.from.box.querySelector(".inner-rect").classList.remove("hover-highlight");
            conn.to?.box?.querySelector(".inner-rect")?.classList.remove("hover-highlight");
          }
        });
        polyline.addEventListener("dblclick", e => {
          e.stopPropagation();
          svg.removeChild(polyline);
          const index = connections.findIndex(c => c.polyline === polyline);
          if (index !== -1) {
            const connRemoved = connections[index];
            removeStepConnection(connRemoved);
            connections.splice(index, 1);
            printSteps();
          }
        });

        currentConnection = {
          polyline,
          from: { box, connector: connector.classList.contains("top") ? "top" : "bottom" },
          mouseMoveHandler: ev => {
            const mx = ev.clientX - rect.left;
            const my = ev.clientY - rect.top;
            currentConnection.polyline.setAttribute("points", `${x},${y} ${mx},${my}`);
          }
        };

        document.addEventListener("mousemove", currentConnection.mouseMoveHandler);
      } else {
        if (currentConnection.mouseMoveHandler) {
          document.removeEventListener("mousemove", currentConnection.mouseMoveHandler);
        }

        const fromConn = currentConnection.from.box.querySelector(`.connector.${currentConnection.from.connector}`);
        const fromRect = fromConn.getBoundingClientRect();
        const fromX = fromRect.left + 3 - rect.left;
        const fromY = currentConnection.from.connector === "bottom"
          ? fromRect.bottom - rect.top
          : fromRect.top - rect.top;

        const toX = x;
        const toY = y;
        let points = "";

        if (currentConnection.from.connector === "bottom" &&
            connector.classList.contains("top") &&
            toY < fromY) {
          const offsetX = Math.min(fromX, toX) - 50;
          const y1 = fromY + 10;
          const y2 = toY - 10;
          points = [
            `${fromX},${fromY}`,
            `${fromX},${y1}`,
            `${offsetX},${y1}`,
            `${offsetX},${y2}`,
            `${toX},${y2}`,
            `${toX},${toY}`
          ].join(" ");
        } else {
          points = `${fromX},${fromY} ${toX},${toY}`;
        }

        currentConnection.polyline.setAttribute("points", points);

        connections.push({
          ...currentConnection,
          to: { box, connector: connector.classList.contains("top") ? "top" : "bottom" }
        });

        addStepConnection(currentConnection.from.box, box);

        currentConnection = null;

        printSteps();
      }
    });
  });
}

function attachHoverListeners(box) {
  const inner = box.querySelector(".inner-rect");
  box.addEventListener("mouseenter", () => {
    inner.classList.add("hover-highlight");
  });
  box.addEventListener("mouseleave", () => {
    inner.classList.remove("hover-highlight");
  });
}

function attachRemoveListener(box) {
  box.addEventListener("dblclick", () => {
    const svg = getOrCreateSVG();
    for (let i = connections.length - 1; i >= 0; i--) {
      const c = connections[i];
      if (c.from.box === box || c.to.box === box) {
        svg.removeChild(c.polyline);
        removeStepConnection(c);
        connections.splice(i, 1);
        printSteps();
      }
    }
    canvas.removeChild(box);

    const stepIndex = stepsList.findIndex(s => s.element === box);
    if (stepIndex !== -1) {
      stepsList.splice(stepIndex, 1);
    }

    renumberBoxes();
    printSteps();
  });
}

function renumberBoxes() {
  const boxes = [...canvas.querySelectorAll(".box")];
  boxes.forEach((box, index) => {
    box.querySelector(".inner-rect").textContent = index + 1;
  });
}

function getOrCreateSVG() {
  let svg = canvas.querySelector("svg");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    canvas.appendChild(svg);
  }
  return svg;
}

function updateConnections(box) {
  const rect = canvas.getBoundingClientRect();
  connections.forEach(conn => {
    if (conn.from.box === box || conn.to.box === box) {
      const fromConn = conn.from.box.querySelector(`.connector.${conn.from.connector}`);
      const toConn = conn.to.box.querySelector(`.connector.${conn.to.connector}`);

      const fromX = fromConn.getBoundingClientRect().left + 3 - rect.left;
      const fromY = conn.from.connector === "top"
        ? fromConn.getBoundingClientRect().top - rect.top
        : fromConn.getBoundingClientRect().bottom - rect.top;

      const toX = toConn.getBoundingClientRect().left + 3 - rect.left;
      const toY = conn.to.connector === "top"
        ? toConn.getBoundingClientRect().top - rect.top
        : toConn.getBoundingClientRect().bottom - rect.top;

      let points = "";
      if (conn.from.connector === "bottom" && conn.to.connector === "top" && toY < fromY) {
        const offsetX = Math.min(fromX, toX) - 50;
        const y1 = fromY + 10;
        const y2 = toY - 10;
        points = [
          `${fromX},${fromY}`,
          `${fromX},${y1}`,
          `${offsetX},${y1}`,
          `${offsetX},${y2}`,
          `${toX},${y2}`,
          `${toX},${toY}`
        ].join(" ");
      } else {
        points = `${fromX},${fromY} ${toX},${toY}`;
      }

      conn.polyline.setAttribute("points", points);
    }
  });
}

function addStepConnection(fromBox, toBox) {
  const fromId = parseInt(fromBox.getAttribute("data-id"));
  const toId = parseInt(toBox.getAttribute("data-id"));
  if (isNaN(fromId) || isNaN(toId)) return;

  const fromStep = stepsList.find(s => s.id === fromId);
  const toStep = stepsList.find(s => s.id === toId);
  if (!fromStep || !toStep) return;

  if (!fromStep.outputs.includes(toId)) {
    fromStep.outputs.push(toId);
  }
  if (!toStep.inputs.includes(fromId)) {
    toStep.inputs.push(fromId);
  }
}

function removeStepConnection(connection) {
  const fromId = parseInt(connection.from.box.getAttribute("data-id"));
  const toId = parseInt(connection.to.box.getAttribute("data-id"));
  if (isNaN(fromId) || isNaN(toId)) return;

  const fromStep = stepsList.find(s => s.id === fromId);
  const toStep = stepsList.find(s => s.id === toId);
  if (!fromStep || !toStep) return;

  fromStep.outputs = fromStep.outputs.filter(id => id !== toId);
  toStep.inputs = toStep.inputs.filter(id => id !== fromId);
}

testBtn.addEventListener("click", () => {
  const boxes = canvas.querySelectorAll(".box");
  let i = 0;
  function activateNext() {
    if (i > 0) {
      const prev = boxes[i - 1];
      prev.dataset.state = "inactive";
      prev.querySelector(".inner-rect").style.border = "";
    }
    if (i < boxes.length) {
      const current = boxes[i];
      current.dataset.state = "active";    
      let id = Number(current.dataset.id);                                
      current.querySelector(".inner-rect").style.border = stepsList[id - 1].type == "start_step" 
                                                              ? "4px double darkblue" 
                                                              : "2px solid darkblue";

      console.log("Box state: ", current)
      i++;
      setTimeout(activateNext, 1000);
    }
  }
  activateNext();
});

function atualizarVisualizacaoSteps() {
  stepsList.forEach(step => {
    const inner = step.element.querySelector(".inner-rect");
    // if (step.state === "active") {
    //   inner.style.border = step.type === "start_step"
    //     ? "4px double darkblue"
    //     : "2px solid darkblue";
    // } else {
    //   inner.style.border = "";
    // }

    step.transitions.forEach(trId => {
      transitionsList.filter(t => t.id == trId).map(t => {
        if(t.triggered) {
          console.log(t.id + " is Triggered");

          if(t.triggered) {
            let inputIds = t.inputSteps;
            let outputIds = t.outputSteps;

            console.log("InputStepsIds", inputIds);
            console.log("OutputStepsIds", outputIds);

            inputIds.forEach(i => {
              stepsList.filter(s => i == s.id).state = "inactive";
            })

            outputIds.forEach(o => {
              stepsList.filter(s => i == s.id).state = "active";
            });
          }
        } else {
          //console.log(t.id + " is NOT Triggered");
        }
      });
    })


  });
}

// Executar a cada 1000 ms
setInterval(atualizarVisualizacaoSteps, 1000);
