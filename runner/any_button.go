package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"io"
	"os"
	"os/exec"
)

func main() {
	lengthBytes := make([]byte, 4)
	if _, err := io.ReadFull(os.Stdin, lengthBytes); err != nil {
		return
	}

	length := binary.LittleEndian.Uint32(lengthBytes)
	messageBytes := make([]byte, length)
	if _, err := io.ReadFull(os.Stdin, messageBytes); err != nil {
		return
	}

	var shellCommand string
	if err := json.Unmarshal(messageBytes, &shellCommand); err != nil {
		sendMessage(map[string]interface{}{"success": false, "error": "Invalid JSON: " + err.Error()})
		return
	}

	cmd := exec.Command("cmd", "/C", shellCommand)
	cmd.Dir = os.Getenv("SystemDrive") + `\`

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		sendMessage(map[string]interface{}{
			"success": false,
			"error":   stderr.String(),
			"output":  stdout.String(),
		})
	} else {
		sendMessage(map[string]interface{}{
			"success": true,
			"output":  stdout.String(),
		})
	}
}

func sendMessage(message map[string]interface{}) {
	encoded, _ := json.Marshal(message)
	length := uint32(len(encoded))
	binary.Write(os.Stdout, binary.LittleEndian, length)
	os.Stdout.Write(encoded)
}
