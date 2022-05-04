import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MysqlHelperService {

  constructor() { }

  mysqlToCSType(type:string){
    if(type.includes('char') || type.includes('longtext')){
      return 'string';
    }
    else if(type.includes('bigint')){
      return 'long';
    }
    else if(type.includes('int')){
      return 'int';
    }
    else if(type.includes('date')){
      return 'DateTime'
    }
  }
}
