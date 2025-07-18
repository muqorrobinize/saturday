/**
 * This is the "brain" of your AI assistant, Saturday.
 * It runs on Cloudflare's servers and is responsible for
 * understanding natural language commands and turning them
 * into structured JSON data that your browser extension can execute.
 */

// Define the environment variables, including the AI binding.
export interface Env {
  AI: any;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // We only expect POST requests from the extension.
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed. Please use POST.', { status: 405 });
    }

    // Parse the JSON body from the request.
    const { command, context } = await request.json();

    if (!command) {
      return new Response('JSON body must include a "command" property.', { status: 400 });
    }

    // This is the core personality and instruction set for Saturday.
    // The AI will follow these rules to generate its response.
    const system_prompt = `You are "Saturday", an AI assistant. Your personality is insightful, friendly, and exceptionally capable. Your primary function is to understand user commands and convert them into a structured JSON format. ALWAYS respond with ONLY a valid JSON object. Do not add any explanatory text before or after the JSON.

    The valid actions are: "open_tab", "search_google", "download_file", "copy_text", "type_text", "read_page_content", "find_keyword_on_page", "get_weather", "get_time", "add_todo", "get_tasks", "explain_page", "answer_general".

    If the user's command requires context from the webpage (like summarizing or finding a word), use the 'context' data provided.

    Examples:
    - User: "open youtube.com" -> {"action": "open_tab", "value": "https://youtube.com"}
    - User: "search for AI assistants" -> {"action": "search_google", "value": "AI assistants"}
    - User: "add 'buy milk' to my to-do list" -> {"action": "add_todo", "value": "buy milk"}
    - User: "what are my tasks today?" -> {"action": "get_tasks", "value": null}
    - User: "explain this article to me" -> {"action": "explain_page", "value": "context_required"}
    - User: "who was the first US president?" -> {"action": "answer_general", "value": "who was the first US president?"}
    `;

    try {
      // Build the messages array for the AI model
      const messages = [
          { role: 'system', content: system_prompt },
          { role: 'user', content: command as string }
      ];

      // If context (like page text for summarization) is provided, add it to the user's message.
      if (context) {
        messages[1].content = `Based on the following context, please process the command.\n\nContext:\n"""\n${context}\n"""\n\nCommand: "${command as string}"`;
      }

      // Run the AI model with our system prompt and the user's command.
      const { response } = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: messages
      });

      // Return the AI's JSON response directly to the browser extension.
      return new Response(response, {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (e: any) {
      // Handle any errors from the AI service.
      return new Response(`Error processing AI command: ${e.message}`, { status: 500 });
    }
  },
};
