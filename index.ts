export interface Env {
  AI: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // --- Endpoint 1: Audio Transcription ---
    if (url.pathname === '/transcribe') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed. Use POST for transcription.', { status: 405 });
      }

      try {
        // Get the audio data from the request body
        const audioBlob = await request.blob();
        const audioData = [...new Uint8Array(await audioBlob.arrayBuffer())];

        // Run the Whisper AI model for speech-to-text
        const response = await env.AI.run('@cf/openai/whisper', {
          audio: audioData,
        });

        // Return the transcribed text
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (e: any) {
        return new Response(`Error during transcription: ${e.message}`, { status: 500 });
      }
    }

    // --- Endpoint 2: Command Parsing ---
    if (url.pathname === '/command') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed. Use POST for commands.', { status: 405 });
      }

      const { command, context } = await request.json();

      if (!command) {
        return new Response('JSON body must include a "command" property.', { status: 400 });
      }

      const system_prompt = `You are "Saturday", an AI assistant. Your personality is insightful, friendly, and exceptionally capable. Your primary function is to understand user commands and convert them into a structured JSON format. ALWAYS respond with ONLY a valid JSON object. Do not add any explanatory text before or after the JSON. The valid actions are: "open_tab", "search_google", "download_file", "copy_text", "type_text", "read_page_content", "find_keyword_on_page", "get_weather", "get_time", "add_todo", "get_tasks", "explain_page", "answer_general".`;

      const messages = [{ role: 'system', content: system_prompt }, { role: 'user', content: command as string }];
      if (context) {
        messages[1].content = `Based on the following context, please process the command.\n\nContext:\n"""\n${context}\n"""\n\nCommand: "${command as string}"`;
      }

      try {
        const { response } = await env.AI.run('@cf/meta/llama-3-8b-instruct', { messages });
        return new Response(response, { headers: { 'Content-Type': 'application/json' } });
      } catch (e: any) {
        return new Response(`Error processing command: ${e.message}`, { status: 500 });
      }
    }

    // --- Default Response for other paths ---
    return new Response('Endpoint not found. Use /transcribe or /command.', { status: 404 });
  },
};
