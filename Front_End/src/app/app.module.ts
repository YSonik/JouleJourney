import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { GoogleMapsModule } from '@angular/google-maps';

import { AppComponent } from './app.component';
import { MapComponent } from './map/map.component';
import { GoogleMapsService } from './services/google-maps.service';
import { JourneySearchComponent } from './map/journey-search/journey-search.component'

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    JourneySearchComponent
  ],
  imports: [
    BrowserModule,
    GoogleMapsModule
  ],
  providers: [GoogleMapsService],
  bootstrap: [AppComponent]
})
export class AppModule { }
