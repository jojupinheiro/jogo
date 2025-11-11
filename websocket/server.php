<?php
// Definir o endereço e a porta do servidor WebSocket
$host = '127.0.0.1';
$port = 8081;

// Criar um socket TCP/IP
$serverSocket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
socket_bind($serverSocket, $host, $port);
socket_listen($serverSocket);

echo "Servidor WebSocket rodando em ws://$host:$port...\n";

// Array para armazenar conexões de clientes
$clients = [$serverSocket];

// Função para realizar o Handshaking
function performHandshaking($clientSocket, $headers)
{
    $upgrade  = "HTTP/1.1 101 Switching Protocols\r\n";
    $upgrade .= "Upgrade: websocket\r\n";
    $upgrade .= "Connection: Upgrade\r\n";
    $upgrade .= "Sec-WebSocket-Accept: " . base64_encode(
        sha1($headers['Sec-WebSocket-Key'] . '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', true)
    ) . "\r\n\r\n";

    socket_write($clientSocket, $upgrade, strlen($upgrade));
}

// Função para decodificar mensagens WebSocket
function decodeWebSocketMessage($data)
{
    $unpacked = unpack('C*', $data);
    $length = $unpacked[2] & 127;

    if ($length === 126) {
        $masks = array_slice($unpacked, 4, 4);
        $data = array_slice($unpacked, 8);
    } elseif ($length === 127) {
        $masks = array_slice($unpacked, 10, 4);
        $data = array_slice($unpacked, 14);
    } else {
        $masks = array_slice($unpacked, 2, 4);
        $data = array_slice($unpacked, 6);
    }

    $message = '';
    foreach ($data as $key => $byte) {
        $message .= chr($byte ^ $masks[$key % 4]);
    }

    return $message;
}

// Função para codificar mensagens WebSocket
function encodeWebSocketMessage($message)
{
    $header = " ";
    $header[0] = chr(129); // Text frame
    $length = strlen($message);

    if ($length <= 125) {
        $header[1] = chr($length);
    } elseif ($length >= 126 && $length <= 65535) {
        $header[1] = chr(126);
        $header .= pack('n', $length);
    } else {
        $header[1] = chr(127);
        $header .= pack('J', $length);
    }

    return $header . $message;
}

while (true) {
    // Preparar a lista de sockets para socket_select()
    $readSockets = $clients;
    $writeSockets = null;
    $exceptSockets = null;

    // Monitorar múltiplos sockets
    socket_select($readSockets, $writeSockets, $exceptSockets, 0, 10);

    // Verificar novas conexões
    if (in_array($serverSocket, $readSockets)) {
        $newSocket = socket_accept($serverSocket);
        $clients[] = $newSocket;

        // Ler os cabeçalhos e realizar o Handshaking
        $headers = [];
        $request = socket_read($newSocket, 1024);
        if (preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $request, $matches)) {
            $headers['Sec-WebSocket-Key'] = trim($matches[1]);
        }

        performHandshaking($newSocket, $headers);

        echo "Novo cliente conectado.\n";
        unset($readSockets[array_search($serverSocket, $readSockets)]);
    }

    // Gerenciar mensagens de clientes
    foreach ($readSockets as $socket) {
        $data = @socket_read($socket, 1024, PHP_BINARY_READ);

        if ($data === false) {
            // Cliente desconectado
            echo "Cliente desconectado.\n";
            unset($clients[array_search($socket, $clients)]);
            socket_close($socket);
            continue;
        }

        $message = decodeWebSocketMessage($data);
        echo "Mensagem recebida: $message\n";

        // Repassar a mensagem para todos os clientes conectados
        $encodedMessage = encodeWebSocketMessage($message);
        foreach ($clients as $client) {
            if ($client !== $serverSocket && $client !== $socket) {
                @socket_write($client, $encodedMessage, strlen($encodedMessage));
            }
        }
    }
}

// Fechar o servidor
socket_close($serverSocket);
?>
