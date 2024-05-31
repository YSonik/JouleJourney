import { Component, OnInit } from '@angular/core';
import { GoogleMapsService } from '../services/google-maps.service';
import { RoutingAlgorithmService } from '../services/routing-algorithm.service';

type journey_data = {
  origin_string: string;
  destination_string: string;
  range_string: string;
}

type fuel_data = {
  fuel_type: string;
};

type trip_summary = {
  trip_distance: any;
  trip_duration: any;
  stations_visited: any;
  time_spent_at_stations: any;
};

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
  #distance_matrix_service!: google.maps.DistanceMatrixService;
  #directions_service!: google.maps.DirectionsService;
  #directions_render_service!: google.maps.DirectionsRenderer;
  #custom_icons!: any;
  #info_window!: google.maps.InfoWindow; 
  #fuel_type: string = "electricity";

  //Trip summary elements
  #trip_summary_element!: HTMLElement;
  #trip_distance_element!: HTMLInputElement;
  #trip_duration_element!: HTMLInputElement;
  #trip_stations_visited_element!: HTMLInputElement;
  #trip_time_spent_at_stations_element!: HTMLInputElement;

  
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

    //Instantiate the distance_matrix_service.
    this.#distance_matrix_service = new google.maps.DistanceMatrixService();

    //Instantiate the directions_service.
    this.#directions_service = new google.maps.DirectionsService();

    //Instantiate the directions_render_service.
    this.#directions_render_service = new google.maps.DirectionsRenderer();
    this.#directions_render_service.setMap(this.#map_object);
    this.#directions_render_service.setOptions({suppressMarkers: true});
    
    this.#custom_icons = new Map([
      ["origin", {url: "../../assets/origin.png", scaledSize: new google.maps.Size(100,80)}],
      ["destination", {url: "../../assets/destination.png",scaledSize: new google.maps.Size(70,70)}],
      ["electricity", {url: "../../assets/chargingStation.png", scaledSize: new google.maps.Size(50,50)}],
      ["gasoline", {url: "../../assets/gasStation.png", scaledSize: new google.maps.Size(70,70)}]
    ]);

    //Instantiate the InfoWindow class.
    this.#info_window = new google.maps.InfoWindow();

    //Trip summary elements.
    this.#trip_summary_element = (document.getElementById("trip_summary_table") as HTMLElement);
    this.#trip_distance_element = (document.getElementById("trip_distance") as HTMLInputElement);
    this.#trip_duration_element = (document.getElementById("trip_duration") as HTMLInputElement);
    this.#trip_stations_visited_element = (document.getElementById("stations_visited") as HTMLInputElement);
    this.#trip_time_spent_at_stations_element = (document.getElementById("time_spent_at_stations") as HTMLInputElement);
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

  changeFuel(data: fuel_data)
  {
    this.#fuel_type = data.fuel_type;
  }

  displayTripSummary()
  {
    //Wait until the trip summary is ready.
    let trip_stats: any = this.routingAlgorithmService.getTripSummary();
    if(trip_stats == false)
    {
      setTimeout(()=>{this.displayTripSummary()}, 100);
    }
    else
    {
      //Update the trip summary table.
      this.#trip_distance_element.value = `${trip_stats.trip_distance}`;
      this.#trip_duration_element.value = `${trip_stats.trip_duration}`;
      this.#trip_stations_visited_element.value = `${trip_stats.stations_visited}`;
      this.#trip_time_spent_at_stations_element.value = `${trip_stats.time_spent_at_stations}`;
      
      //Display the updated trip summary table.
      this.#trip_summary_element.style.visibility = "visible";  
    }
  }

  createJourney(data: journey_data)
  {
    //Hide the trip summary table.
    this.#trip_summary_element.style.visibility = "hidden";

    //Compute new journey.
    this.routingAlgorithmService.constructJourney(data,
                                                  this.#fuel_type,
                                                  this.#map_object,
                                                  this.#custom_icons,
                                                  this.#info_window,
                                                  this.#places_service,
                                                  this.#distance_matrix_service,
                                                  this.#directions_service,
                                                  this.#directions_render_service);
    
    this.displayTripSummary();
  }

}
