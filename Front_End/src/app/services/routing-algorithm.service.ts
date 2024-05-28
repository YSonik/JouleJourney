import { Injectable, computed } from '@angular/core';

type journey_data = {
  origin_string: string;
  destination_string: string;
  range_string: string;
}

type charger_object = {
  photo: any;
  name: any;
  rating: any;
  geometry: any;
};

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
  #current_vehicle_range!:number;
  #journey_distance!: any;

  #charger_objects:any[] = [];
  
  constructor() 
  { 
    this.#origin_ready = false;
    this.#destination_ready = false;
  }


  findCharger(origin_coords: google.maps.LatLng,
              destination_coords: google.maps.LatLng,
              places_service: google.maps.places.PlacesService,
              directions_service: google.maps.DirectionsService,
              directions_render_service: google.maps.DirectionsRenderer,
              distance_matrix_service: google.maps.DistanceMatrixService)
  {
    //Search for charging stations within a current_range radius of the origin.
    let search_request = {
      location: origin_coords,
      query: 'Electric Car Charger or Tesla Supercharger',
      fields: ['geometry'],
      radius: this.#current_vehicle_range
    };

    //Returns an array of all matches within the radius.
    places_service.textSearch(search_request, (results, status) => {
      
      if(status == google.maps.places.PlacesServiceStatus.OK && results != null)
      {
        let num_chargers = results.length;

        this.#charger_objects = [];
        for (let i=0; i<num_chargers; i++) {
          let current_charger: charger_object = {
            photo: "",
            name: results[i].name,
            rating: results[i].rating,
            geometry: results[i].geometry?.location
          }
          this.#charger_objects.push(current_charger);
        }
        console.log(this.#charger_objects);
         //getDistanceMatrix(origin_coords, destination_coords, waypoint_objects);
      }
      else
      {
        alert("Error: couldn't find chargers in the specified radius.");
      }

    });
  }


  chargingRequired()
  {
    return ((this.#current_vehicle_range*0.8) <= this.#journey_distance); //Journey distance must be less than 80% of current_range for direct routing. 
  }


  computeDistance(origin_coords: google.maps.LatLng,
                  destination_coords: google.maps.LatLng,
                  places_service: google.maps.places.PlacesService,
                  directions_service: google.maps.DirectionsService,
                  directions_render_service: google.maps.DirectionsRenderer,
                  distance_matrix_service: google.maps.DistanceMatrixService)
  {
    let directions_request: any = {
      origin: origin_coords,
      destination: destination_coords,
      provideRouteAlternatives: false,
      travelMode: 'DRIVING'
    };

    directions_service.route(directions_request, (results, status) =>{
      
      if(status == google.maps.DirectionsStatus.OK && results != null)
      { 
        //Extract the journey distance from the result.
        this.#journey_distance = results.routes[0].legs[0].distance?.value;
        console.log(`The distance from ${this.#origin_data.name} to ${this.#destination_data.name} is ${this.#journey_distance} meters\n`);
        console.log(`Your vehicle's range is ${this.#max_vehicle_range} meters\n`);

        //Determine whether charging-stops are needed.
        if(this.chargingRequired())
        {
          //Recursively append charging stations until charging is not required.
          this.findCharger(origin_coords,
                           destination_coords, 
                           places_service,
                           directions_service,
                           directions_render_service,
                           distance_matrix_service);
        }
        else
        {
          //Render the direct route.

        }
      }
      else
      {
        alert("Error: Couldn't get directions from origin to destination.")
      }

    });
  }


  waitForPlaces(places_service: google.maps.places.PlacesService,
                directions_service: google.maps.DirectionsService,
                directions_render_service: google.maps.DirectionsRenderer,
                distance_matrix_service: google.maps.DistanceMatrixService)
  {
    if(this.#origin_ready && this.#destination_ready)
    {
      //Reset the flags
      this.#origin_ready = false;
      this.#destination_ready = false;

      //Proceed <Data can be null>
      if(this.#origin_data == null || this.#destination_data == null)
      {
        return;
      }
      else
      {
        this.computeDistance(this.#origin_data.geometry.location, 
                             this.#destination_data.geometry.location,
                             places_service,
                             directions_service,
                             directions_render_service,
                             distance_matrix_service);
      }
    }
    else
    {
      setTimeout(()=>{this.waitForPlaces(places_service, directions_service, directions_render_service, distance_matrix_service);}, 100);
    }
  }


  getPlacesData(data: journey_data, 
                places_service: google.maps.places.PlacesService)
  {
    //You can get photos as fields.
    let origin_request = {
      query: data.origin_string,
      fields: ['name','geometry']
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
      fields: ['name','geometry']
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


  constructJourney(data: journey_data, 
                   places_service: google.maps.places.PlacesService,
                   directions_service: google.maps.DirectionsService,
                   directions_render_service: google.maps.DirectionsRenderer,
                   distance_matrix_service: google.maps.DistanceMatrixService)
  {
    //Step #1: Use the places API to find the location corresponding to the input strings.
    this.getPlacesData(data, places_service);
    
    this.#max_vehicle_range = (parseInt(data.range_string)*1000);
    this.#current_vehicle_range = this.#max_vehicle_range;
    this.waitForPlaces(places_service, directions_service, directions_render_service, distance_matrix_service);

  }

}
