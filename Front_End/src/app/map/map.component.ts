import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'embedded-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements AfterViewInit {

  //Member Variables
  private map_options!: google.maps.MapOptions;
  private map_element!: any;
  private map_object!: google.maps.Map;

  async initMap()
  {
    //Map centered at Seattle
    this.map_options = {
      center: {lat: 47.608013, lng: -122.335167},
      zoom: 11,
      scrollwheel: false
    };
    this.map_element = document.getElementById("embedded_map");

    const { Map } = await google.maps.importLibrary("maps") as google.maps.MapsLibrary;
    this.map_object = new Map(this.map_element, this.map_options);
  }

  ngAfterViewInit() 
  {
    this.initMap();    
  }

}
