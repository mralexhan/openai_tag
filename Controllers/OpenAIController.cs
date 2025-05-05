//reference https://github.com/openai/openai-dotnet

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using OpenAI.Chat;


namespace KeywordTag.Controllers 
{
    public class OpenAIController : ControllerBase //defines the class name and inherits from the ControllerBase class, which makes http requests possbile
    {

        private readonly IConfiguration _configuration;

        public OpenAIController(IConfiguration configuration){
            _configuration = configuration;
        }

        [HttpPost("openai/complete")]  // This directly tells the controller the route
        public async Task<IActionResult> PostHelloWorld([FromBody] PromptRequest request)  //function that defines what happens when API is called
        {
            string prompt = request.Prompt;
            string? apikey = _configuration["OPENAI_API_KEY"];

            if (string.IsNullOrEmpty(apikey))
            {
                return BadRequest("API key is missing from configuration.");
            }

            ChatClient client = new(
                model: "gpt-4o-mini", 
                apiKey: apikey //puts openai api key from Azure environment variable.
                );
        
            ChatCompletion completion = await client.CompleteChatAsync(
                $"Read through this text thoroughly: {prompt}." + 
                "When you're finished, attach 5 tags that best reflect the contents of the text (ex. UI/UX Design, Financial Underwriting, Automation, etc). " +
                "Also create a 100 word summary of the file that is clear and detailed" +
                "Provide the tags and summary in a JSON file. The JSON file should look like:'{\"files\": [{\"tags\": [],\"summary\": \"\"},{\"tags\": [],\"summary\": \"\"}]}' ");

            Console.WriteLine($"[ASSISTANT]: {completion.Content[0].Text}");
            return Ok(new { message = $"{completion.Content[0].Text}" });  // Send back a response
        }

        public class PromptRequest
        {
            public string Prompt { get; set; } = string.Empty;
        }
    }
}
