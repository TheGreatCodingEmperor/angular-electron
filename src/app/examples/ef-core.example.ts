export const EFCoreExample = `
// // =============================
// // Email: info@ebenmonney.com
// // www.ebenmonney.com/templates
// // =============================

using AutoMapper;
using DAL;
using DAL.Models;
using IdentityServer4.AccessTokenValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuickApp.Helpers;

namespace QuickApp.Controllers {
    [Authorize (AuthenticationSchemes = IdentityServerAuthenticationDefaults.AuthenticationScheme)]
    [Route ("api/[controller]")]
    public class ApplicationController : ControllerBase {
        private readonly ILogger _logger;
        private readonly ApplicationDbContext _context;

        public ApplicationController (ILogger<ApplicationController> logger, ApplicationDbContext context) {
            _logger = logger;
            _context = context;
        }

        // GET: api/values
        [HttpGet]
        public IActionResult Get ([FromQuery] string? Tag, [FromQuery] string? Name, [FromQuery] int page = 1, [FromQuery] int pageSize = 15) {
            var query = _context.Applications.AsQueryable ();
            query = Tag == null?query : query.Where (q => q.Tag == Tag);
            query = Name == null?query : query.Where (q => q.Name == Name);
            _logger.LogDebug ($"Query Applications Tag = {Tag} Name = {Name}");
            return Ok (new { List = query.Skip ((page - 1) * pageSize).Take (pageSize).ToList (), Count = query.Count () });
        }

        [HttpGet ("GetByKey")]
        public (bool Successed, Application? Entity) GetByKey (long Id) {
            var query = _context.Applications.AsQueryable ();
            query = query.Where (q => q.Id == Id);
            var entity = query.SingleOrDefault ();
            return (entity != null, entity);
        }

        // GET api/values/5
        [HttpGet ("{Id}")]
        public async Task<IActionResult> Get (long Id) {
            var result = GetByKey (Id);
            _logger.LogDebug ($"Query Application Id = {Id}");
            if (result.Successed) {
                return Ok (result.Entity);
            } else {
                return NotFound ($"Application Id = {Id} Not Found");
            }
        }

        // POST api/values
        [HttpPost]
        public async Task<IActionResult> Post ([FromBody] CreateApplicationCommand value) {
            Application newEntity = new Application () {
                Tag = value.Tag,
                Name = value.Name
            };
            Utilities.CreateAuditableEntity (User, ref newEntity);
            _context.Applications.Add (newEntity);
            await _context.SaveChangesAsync ();
            _logger.LogInformation ($"Create Application Id = {newEntity.Id}");
            return Ok (newEntity);
        }

        // PUT api/values/5
        [HttpPut ("{Id}")]
        public async Task<IActionResult> Put (long Id, [FromBody] UpdateApplicationCommand value) {
            var result = GetByKey (Id);
            _logger.LogInformation ($"Update Application Id = {Id}");
            if (result.Successed) {
                Application oldEntity = result.Entity;
                Utilities.UpdateAuditableEntity (User, ref oldEntity);
                oldEntity.Tag = value.Tag;
                oldEntity.Name = value.Name;
                _context.Applications.Update (oldEntity);
                await _context.SaveChangesAsync ();
                return Ok (oldEntity);
            } else {
                return NotFound ($"Application Id = {Id} Not Found");
            }
        }

        // DELETE api/values/5
        [HttpDelete ("{Id}")]
        public async Task<IActionResult> Delete (long Id) {
            var result = GetByKey (Id);

            _logger.LogInformation ($"Delete Application Id = {Id}");
            if (result.Successed) {
                _context.Applications.Remove (result.Entity);
                await _context.SaveChangesAsync ();
                return Ok ();
            } else {
                return NotFound ($"Application Id = {Id} Not Found");
            }
        }

    }

    public class CreateApplicationCommand {
        public string Tag { get; set; }
        public string Name { get; set; }
    }
    public class UpdateApplicationCommand {
        public string Tag { get; set; }
        public string Name { get; set; }
    }
}
    `;