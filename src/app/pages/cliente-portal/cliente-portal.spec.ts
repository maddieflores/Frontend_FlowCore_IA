import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientePortal } from './cliente-portal';

describe('ClientePortal', () => {
  let component: ClientePortal;
  let fixture: ComponentFixture<ClientePortal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientePortal],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientePortal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
