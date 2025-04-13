import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartsListComponent } from './parts-list.component';

describe('PartsListComponent', () => {
  let component: PartsListComponent;
  let fixture: ComponentFixture<PartsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartsListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
