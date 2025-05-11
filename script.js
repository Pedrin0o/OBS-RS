let socket;
let password = 'senhaDoOBS'; // Troque pela sua senha do OBS
let connected = false;

function connectOBS() {
  socket = new WebSocket("ws://localhost:4455");


  socket.addEventListener('open', () => {
    console.log("Conectado ao OBS");

    const authMessage = {
      op: 1,
      d: {
        rpcVersion: 1,
        authentication: password
      }
    };

    socket.send(JSON.stringify(authMessage));
    connected = true;
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);

    // Se for a resposta da lista de cenas
    if (message.d && message.d.requestType === "GetSceneList") {
      const scenes = message.d.responseData.scenes;
      createSceneButtons(scenes);
    }
  });

  socket.addEventListener('close', () => {
    console.log("Conexão com OBS encerrada");
    connected = false;
  });

  socket.addEventListener('error', (err) => {
    console.error("Erro na conexão:", err);
  });
}

function sendOBSRequest(requestType, requestData = {}) {
  if (!connected) {
    console.warn("Ainda não conectado ao OBS");
    return;
  }

  const message = {
    op: 6,
    d: {
      requestType: requestType,
      requestId: String(Math.random()),
      requestData: requestData
    }
  };

  socket.send(JSON.stringify(message));
}

function requestSceneList() {
  sendOBSRequest("GetSceneList");
}

function createSceneButtons(scenes) {
  const container = document.getElementById("scene-buttons");
  container.innerHTML = ""; // Limpa botões anteriores

  scenes.forEach(scene => {
    const button = document.createElement("button");
    button.textContent = scene.sceneName;
    button.onclick = () => changeScene(scene.sceneName);
    container.appendChild(button);
  });
}

function changeScene(sceneName) {
  sendOBSRequest("SetCurrentProgramScene", {
    sceneName: sceneName
  });
}

function setTransition(transitionName) {
  sendOBSRequest("SetCurrentSceneTransition", {
    transitionName: transitionName
  });
}

function toggleSource(sourceName) {
  const requestId = String(Math.random());
  const message = {
    op: 6,
    d: {
      requestType: "GetSceneItemList",
      requestId: requestId,
      requestData: {
        sceneName: null
      }
    }
  };

  socket.send(JSON.stringify(message));

  socket.addEventListener('message', function handler(event) {
    const response = JSON.parse(event.data);

    if (response.d && response.d.requestId === requestId) {
      const items = response.d.responseData.sceneItems;
      const item = items.find(i => i.sourceName === sourceName);

      if (item) {
        sendOBSRequest("SetSceneItemEnabled", {
          sceneName: null,
          sceneItemId: item.sceneItemId,
          sceneItemEnabled: !item.sceneItemEnabled
        });
      }

      socket.removeEventListener('message', handler);
    }
  });
}

// Conecta e solicita a lista de cenas
connectOBS();

// Espera um pouco e então solicita cenas (dar tempo de conectar)
setTimeout(requestSceneList, 1000);
