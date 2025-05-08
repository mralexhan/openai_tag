using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;

public class AccountController : Controller
{
    private readonly PasswordHasher<string> _passwordHasher = new PasswordHasher<string>();
    private readonly string _storedHash;

    private readonly IConfiguration _configuration;

    public AccountController(IConfiguration configuration)
    {
        // Manages storing the passwords with Azure Key Vaults
        // var keyVaultUrl = config["KeyVaultUrl"]; //insert Azure Key Vault URL via appsettings.json
        // var client = new SecretClient(new Uri(keyVaultUrl), new DefaultAzureCredential());

        // keyVaultSecret secret = client.GetSecret("StoredPasswordHash"); //retrieves the password from Azure Key Vault
        // _storedHash = secret.Value;

        //Manages storing password hash with Azure App Configuration
        _configuration = configuration;
        _storedHash = _configuration["PASSWORD_HASH"];
    }

    public class LoginRequest
    {
        public string Password { get; set;}
    }

    [HttpPost("account/login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var userId = "dummyUser";
        var result = _passwordHasher.VerifyHashedPassword(userId, _storedHash, request.Password);

        if (result == PasswordVerificationResult.Success)
        {
            return Json(new { success = true}); // Redirect to success if password matches
        }
        else
        {
            return Json(new { success = false, message = "Wrong Password!"}); // Show the login form again
        }
    }
}
