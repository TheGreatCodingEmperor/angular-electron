import { TestBed } from '@angular/core/testing';

import { MysqlHelperService } from './mysql-helper.service';

describe('MysqlHelperService', () => {
  let service: MysqlHelperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MysqlHelperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
