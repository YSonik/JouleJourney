import { Component, OnInit } from '@angular/core';
import { GoogleMapsService } from '../services/google-maps.service';

type journey_data = {
  origin_string: string;
  destination_string: string;
  range_string: string;
}

@Component({
  selector: 'embedded-map',
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {

  //Member Variables
  #map_api_key!: string;
  #map_options!: google.maps.MapOptions;
  #map_options_ready: boolean = false;

  #map_element!: any;
  #map_object!: google.maps.Map;


  #renderMap()
  {
    while(!this.#map_options_ready)
    {
      //Busy wait until user's coordinates are being fetched.
    }
    this.#map_element = document.getElementById("embedded_map");
    this.#map_object = new google.maps.Map(this.#map_element, this.#map_options);
  }

  #loadScript()
  {
    //Load the google maps libraries using the apiKey.
    (window as any)['renderMap'] = () => {this.#renderMap();};

    var script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.#map_api_key}&loading=async&callback=renderMap`;
    document.body.appendChild(script);
  }
  
  ngOnInit()
  {
    this.#map_api_key = this.googleMapsService.getApiKey();
    
    //Center the map at the user's location or at Seattle.
    if(navigator.geolocation)
    {
      navigator.geolocation.getCurrentPosition((position)=>
      {
        this.#map_options = {
          center: {lat: position.coords.latitude, lng: position.coords.longitude},
          zoom: 11,
          scrollwheel: false,
          mapTypeControl: false
        }
        this.#map_options_ready = true;
      });
    }
    else
    {
      this.#map_options = {
        center: {lat: 47.608013, lng: -122.335167},
        zoom: 11,
        scrollwheel: false,
        mapTypeControl: false
      };
      this.#map_options_ready = true;
    }
    
    //this.#loadScript();
  }

  constructor(private googleMapsService: GoogleMapsService)
  {
    //Initialization work done in ngOnInit lifecycle hook.
  }

  create_journey(data: journey_data)
  {
    console.log(data);
  }

}
