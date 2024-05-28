import { Component, OnInit } from '@angular/core';
import { GoogleMapsService } from '../services/google-maps.service';
import { RoutingAlgorithmService } from '../services/routing-algorithm.service';

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
  
  #map_element!: any;
  #map_object!: google.maps.Map;
  #places_service!: google.maps.places.PlacesService;
  #directions_service!: google.maps.DirectionsService;
  #directions_render_service!: google.maps.DirectionsRenderer;
  #distance_matrix_service!: google.maps.DistanceMatrixService;

  
  #renderMap()
  {
    //Center the map at Seattle.
    this.#map_options = {
      center: {lat: 47.608013, lng: -122.335167},
      zoom: 11,
      scrollwheel: false,
      mapTypeControl: false
    };
    
    //Render the embedded map.
    this.#map_element = document.getElementById("embedded_map");
    this.#map_object = new google.maps.Map(this.#map_element, this.#map_options);

    //Instantiate the places_service.
    this.#places_service = new google.maps.places.PlacesService(this.#map_object);

    //Instantiate the directions_service.
    this.#directions_service = new google.maps.DirectionsService();

    //Instantiate the directions_render_service.
    this.#directions_render_service = new google.maps.DirectionsRenderer();
    this.#directions_render_service.setMap(this.#map_object);

    //Instantiate the distance_matrix_service.
    this.#distance_matrix_service = new google.maps.DistanceMatrixService();

  }

  #loadScript()
  {
    //Load the google maps libraries using the apiKey.
    (window as any)['renderMap'] = () => {this.#renderMap();};

    var script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.#map_api_key}&libraries=places&loading=async&callback=renderMap`;
    document.body.appendChild(script);
  }
  
  ngOnInit()
  {
    //Load the google maps libraries.
    this.#map_api_key = this.googleMapsService.getApiKey();
    this.#loadScript();
  }

  constructor(private googleMapsService: GoogleMapsService, private routingAlgorithmService: RoutingAlgorithmService)
  {
    //Initialization work done in ngOnInit lifecycle hook.
  }

  createJourney(data: journey_data)
  {
    this.routingAlgorithmService.constructJourney(data, this.#places_service, this.#directions_service, this.#directions_render_service, this.#distance_matrix_service);
  }

}
