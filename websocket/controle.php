<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Controle</title>

    <style>
        button {
            width: 100px;
            height: 50px;
            margin: 10px;
            font-size: 16px;
        }

        #controls {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>

<body>
    <div id="controls">
        <button id="up">↑</button>
        <button id="left">←</button>
        <button id="right">→</button>
        <button id="down">↓</button>
    </div>

    <script>
        const ws = new WebSocket('ws://127.0.0.1:8081');

        ws.onopen = () => console.log("Conectado ao servidor WebSocket");
        ws.onerror = error => console.error("Erro no WebSocket:", error);
        ws.onclose = () => console.log("WebSocket desconectado");

        // Mapeamento botão → tecla
        const buttonKeyMap = {
            up: 'ArrowUp',
            left: 'ArrowLeft',
            right: 'ArrowRight',
            down: 'ArrowDown'
        };

        // Eventos de controle dos botões
        document.querySelectorAll('button').forEach(button => {

            button.addEventListener('mousedown', () => {
                const key = buttonKeyMap[button.id];
                if (key) {
                    ws.send(JSON.stringify({ type: 'keydown', key }));
                }
            });

            button.addEventListener('mouseup', () => {
                const key = buttonKeyMap[button.id];
                if (key) {
                    ws.send(JSON.stringify({ type: 'keyup', key }));
                }
            });
        });
    </script>
</body>

</html>
