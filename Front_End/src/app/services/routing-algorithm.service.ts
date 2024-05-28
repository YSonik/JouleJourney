import { Injectable } from '@angular/core';

type journey_data = {
  origin_string: string;
  destination_string: string;
  range_string: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoutingAlgorithmService {

  //Member Variables
  #origin_data!: any;
  #origin_ready: boolean;

  #destination_data!: any;
  #destination_ready: boolean;
  
  #moving_origin_data!: any;
  #max_vehicle_range!: number;

  
  constructor() 
  { 
    this.#origin_ready = false;
    this.#destination_ready = false;
  }

  getPlacesData(data: journey_data, places_service: google.maps.places.PlacesService)
  {
    //You can get geometry and photos as fields.
    //You can use location bias to restrict search within vehicle range.
    //locationBias: {radius: 100000,location: {lat: , lng: }} 

    let origin_request = {
      query: data.origin_string,
      fields: ['name','place_id']
    }
    places_service.findPlaceFromQuery(origin_request, (results, status)=>{

      if(status == google.maps.places.PlacesServiceStatus.OK && results != null)
      {
        this.#origin_data = results[0];
      }
      else
      {
        this.#origin_data = null;
        alert("Couldn't find the specified origin.");
      }
      this.#origin_ready = true;
    });

    let destination_request = {
      query: data.destination_string,
      fields: ['name','place_id']
    }
    places_service.findPlaceFromQuery(destination_request, (results, status)=>{

      if(status == google.maps.places.PlacesServiceStatus.OK && results != null)
      {
        this.#destination_data = results[0];
      }
      else
      {
        this.#destination_data = null;
        alert("Couldn't find the specified destination.");
      }
      this.#destination_ready = true;
    });

  }

  waitForPlaces()
  {
    if(this.#origin_ready && this.#destination_ready)
    {
      //Reset the flags
      this.#origin_ready = false;
      this.#destination_ready = false;

      //Proceed <Data can be null>
      console.log(this.#origin_data);
      console.log(this.#destination_data);
    }
    else
    {
      setTimeout(()=>{this.waitForPlaces();}, 100);
    }
  }

  constructJourney(data: journey_data, places_service: google.maps.places.PlacesService)
  {
    //Step #1: Use the places API to find the location corresponding to the input strings.
    this.getPlacesData(data, places_service);
    
    this.waitForPlaces();

  }

}
