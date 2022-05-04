import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Dir } from 'fs';
import { ElectronService } from '../core/services';
import { Connection } from 'mysql';
import { contextIsolated } from 'process';
import { MysqlHelperService } from '../services/mysql-helper.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(
    private mySqlHelper: MysqlHelperService,
    private cdref: ChangeDetectorRef,
    private router: Router,
    private electronService: ElectronService) {
    // console.log(dialog)
    this.con = this.electronService.mysql.createConnection({
      host: "localhost",
      user: "root",
      port: 3307,
      password: '70400845'
    });
  }

  con: Connection;
  value: string = 'ids4_2';
  dbs: any[] = [];
  selectDB: string = '';
  tables: any[] = [];
  selectTable: string = '';
  columns: { Field: string, Type: string, Null: string, Key: string, Defualt: string, Extra: string, Selected: boolean, Compare: string, IsKey: boolean }[] = [];
  result = '';

  ngOnInit(): void {
    console.log('HomeComponent INIT');
    // console.log(this.electronService.fs);
    // console.log(this.electronService.dialog);
  }

  ngAfterViewInit(): void {
    this.selectTable = "123";
    this.con.connect();
    this.getDBs();
  }

  ngOnDestroy(): void {
    this.con.end();
  }

  select() {
    // this.electronService.dialog.showOpenDialog({ filters:[{name:'json',extensions:['json']}], properties: ['openFile','multiSelections'] });
    // this.electronService.fs.readFile('C:/Users/theha/Desktop/Side Project/angular/electron/angular-electron/tsconfig.serve.json',{encoding:'utf-8'},(err:any,dir:Buffer)=>{
    //   console.log(dir)
    // });
  }

  // 1. 查 tables
  // 2. 查 columns
  // 3. create crud

  getDBs() {
    // this.con.connect();
    this.con.query("SELECT `schema_name` from INFORMATION_SCHEMA.SCHEMATA;", (err, result) => {
      if (err) {
        throw err;
      }
      this.dbs = result;
      console.log(this.dbs)
      this.cdref.detectChanges();
    });
    // this.con.end();
  }

  getTables(dbName: string) {
    this.con.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = '${dbName}';`, (err, result) => {
      if (err) {
        throw err;
        // console.log(err)
      }
      this.tables = result;
      this.cdref.detectChanges();
    });
  }

  getColumns(dbName: string, tableName: string) {
    this.con.query(`DESCRIBE \`${dbName}\`.\`${tableName}\`;`, (err, result) => {
      if (err) {
        throw err;
        // console.log(err)
      }
      this.columns = result;
      this.columns.forEach(col => col.Selected = true);
      this.cdref.detectChanges();
    });
  }

  generate() {
    let tableName = this.selectTable;
    let tableClassName = tableName[0].toUpperCase() + tableName.slice(1);
    let tableEntityName = tableName[0].toUpperCase() + tableName.slice(1,-1);
    let editColumns = this.columns.filter(x => x.Selected);
    let queryColumns = this.columns.filter(x => x.Selected && x.Compare);
    let keyColumns = this.columns.filter(x => x.IsKey);
    let getListApi = `
// GET: api/values
[HttpGet]
public IActionResult Get (${queryColumns.map(col => {
      return `[FromQuery] ${this.mySqlHelper.mysqlToCSType(col.Type)}? ${col.Field}`
    }).join(',')},[FromQuery] int page=1,[FromQuery] int pageSize=15) {
    var query = _context.${tableClassName}.AsQueryable();
    ${queryColumns.map(col => {
      return `query = ${col.Field}==null?query:query.Where(q => q.${col.Field} ${col.Compare} ${col.Field});`
    }).join('\r\n')}
    _logger.LogDebug($"Query ${tableClassName} ${queryColumns.map(col => {
      return `${col.Field} = {${col.Field}}`
    }).join(' ')}");
    return Ok (new {List = query.Skip((page-1)*pageSize).Take(pageSize).ToList(),Count=query.Count()});
}
`
let getByKeyApi = `
[HttpGet("GetByKey")]
        public (bool Successed, ${tableEntityName}? Entity) GetByKey (${keyColumns.map(col => {
          return `${this.mySqlHelper.mysqlToCSType(col.Type)} ${col.Field}`;
        }).join(',')}) {
            var query = _context.${tableClassName}.AsQueryable();
            ${keyColumns.map(col => {
              return `query = query.Where(q => q.${col.Field} == ${col.Field});`
            }).join('\r\n')}
            var entity = query.SingleOrDefault ();
            return (entity != null, entity);
        }`

        let getApi=`
        // GET api/values/5
        [HttpGet ("${keyColumns.map(col => {
          return `{${col.Field}}`;
        }).join('/')}")]
        public async Task<IActionResult> Get (${keyColumns.map(col => {
          return `${this.mySqlHelper.mysqlToCSType(col.Type)} ${col.Field}`;
        }).join(',')}) {
            var result = GetByKey (${keyColumns.map(col => {
              return `${col.Field}`;
            }).join(',')});
            _logger.LogDebug($"Query ${tableEntityName} ${keyColumns.map(col => {
              return `${col.Field} = {${col.Field}}`
            }).join(' ')}");
            if (result.Successed) {
                return Ok (result.Entity);
            } else {
                return NotFound ($"${tableEntityName} ${keyColumns.map(col => {
                  return `${col.Field} = {${col.Field}}`
                }).join(' ')} Not Found");
            }
        }`

        let postApi = `
        // POST api/values
        [HttpPost]
        public async Task<IActionResult> Post ([FromBody] Create${tableEntityName}Command value) {
            ${tableEntityName} newEntity = new ${tableEntityName}(){
                ${
                  editColumns.map(col => {
                    return `${col.Field} = value.${col.Field}`
                  }).join(',\r\n')
                }
            };
            Utilities.CreateAuditableEntity(User,ref newEntity);
            _context.${tableClassName}.Add (newEntity);
            await _context.SaveChangesAsync ();
            _logger.LogInformation($"Create ${tableEntityName} ${keyColumns.map(col => {
              return `${col.Field} = {newEntity.${col.Field}}`;
            }).join(' ')}");
            return Ok (newEntity);
        }
        `;
        let putApi=`
        // PUT api/values/5
        [HttpPut ("${keyColumns.map(col => {
          return `{${col.Field}}`;
        }).join('/')}")]
        public async Task<IActionResult> Put (${keyColumns.map(col => {
          return `${this.mySqlHelper.mysqlToCSType(col.Type)} ${col.Field}`;
        }).join(',')}, [FromBody] Update${tableEntityName}Command value) {
          var result = GetByKey (${keyColumns.map(col => {
            return `${col.Field}`;
          }).join(',')});
          _logger.LogInformation($"Update ${tableEntityName} ${keyColumns.map(col => {
            return `${col.Field} = {${col.Field}}`;
          }).join(' ')}");
            if (result.Successed) {
                ${tableEntityName} oldEntity = result.Entity;
                Utilities.UpdateAuditableEntity(User,ref oldEntity);
                ${editColumns.filter(x => !x.IsKey).map(col => {
                  return `oldEntity.${col.Field} = value.${col.Field};`;
                }).join('\r\n')}
                _context.${tableClassName}.Update (oldEntity);
                await _context.SaveChangesAsync ();
                return Ok (oldEntity);
            } else {
                return NotFound ($"${tableEntityName} ${keyColumns.map(col => {
                  return `${col.Field} = {${col.Field}}`
                }).join(' ')} Not Found");
            }
        }`

        let deleteApi=`
        // DELETE api/values/5
        [HttpDelete ("${keyColumns.map(col => {
          return `{${col.Field}}`;
        }).join('/')}")]
        public async Task<IActionResult> Delete (${keyColumns.map(col => {
          return `${this.mySqlHelper.mysqlToCSType(col.Type)} ${col.Field}`;
        }).join(',')}) { 
          var result = GetByKey (${keyColumns.map(col => {
            return `${col.Field}`;
          }).join(',')});

             _logger.LogInformation($"Delete ${tableEntityName} ${keyColumns.map(col => {
              return `${col.Field} = {${col.Field}}`
            }).join(' ')}");
            if (result.Successed) {
                _context.${tableClassName}.Remove (result.Entity);
                await _context.SaveChangesAsync ();
                return Ok ();
            } else {
                return NotFound ($"${tableEntityName} ${keyColumns.map(col => {
                  return `${col.Field} = {${col.Field}}`
                }).join(' ')} Not Found");
            }
        }
        `

        let commands = `
        public class Create${tableEntityName}Command{
          ${editColumns.map(col => {
            return `public ${this.mySqlHelper.mysqlToCSType(col.Type)} ${col.Field} {get;set;}`;
          }).join('\r\n')}
      }
      public class Update${tableEntityName}Command{
        ${editColumns.filter(x => !x.IsKey).map(col => {
          return `public ${this.mySqlHelper.mysqlToCSType(col.Type)} ${col.Field} {get;set;}`;
        }).join('\r\n')}
      }`

      this.result = `
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
    [Authorize(AuthenticationSchemes = IdentityServerAuthenticationDefaults.AuthenticationScheme)]
    [Route ("api/[controller]")]
    public class ${tableEntityName}Controller : ControllerBase {
        private readonly ILogger _logger;
        private readonly ApplicationDbContext _context;

        public ${tableEntityName}Controller (ILogger<${tableEntityName}Controller> logger, ApplicationDbContext context) {
            _logger = logger;
            _context = context;
        }
        ${getListApi}
        ${getByKeyApi}
        ${getApi}
        ${postApi}
        ${putApi}
        ${deleteApi}
      }
      ${commands}
  }`
  }
}
