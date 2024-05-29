import { Injectable, computed } from '@angular/core';

type journey_data = {
  origin_string: string;
  destination_string: string;
  range_string: string;
}

type station_object = {
  place_id: any;
  name: any;
  rating: any;
  address: any;
  geometry: any;
  distance_to_origin: any;
  time_to_origin: any;
  distance_to_destination: any;
  time_to_destination: any;
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
  #fuel_type = "electricity";
  #fuel_queries = new Map([
    ["electricity", 'Electric vehicle charging station'],
    ["gasoline", 'Gas station']
  ]);
  

  #station_objects:any[] = [];
  #optimal_stations:any = [];
  #final_route:any = [];
  
  constructor() 
  { 
    this.#origin_ready = false;
    this.#destination_ready = false;
  }

  selectStation()
  {
    let num_stations = this.#station_objects.length;
    let chosen_index = 0;

    for(let i=0; i<num_stations; i++)
    {
      let current_station = this.#station_objects[i];
      //The chosen station must be within current_range and have the shortest distance to the destination.
      if(current_station.distance_to_origin < this.#current_vehicle_range &&
         current_station.distance_to_destination <= this.#station_objects[chosen_index].distance_to_destination)
      {
        chosen_index = i;
      }
    }

    //Edge Case #1: None of the stations satisfy the conditions thus no route possible.
    if(chosen_index == 0 &&
       this.#station_objects[chosen_index].distance_to_origin >= this.#current_vehicle_range)
    {
      alert("No Route 1: There are insufficient stations within your current_range.");
      return -1;
    }

    return chosen_index;
  }


  constructRoute(origin_coords: google.maps.LatLng,
                 destination_coords: google.maps.LatLng,
                 places_service: google.maps.places.PlacesService,
                 directions_service: google.maps.DirectionsService,
                 directions_render_service: google.maps.DirectionsRenderer,
                 distance_matrix_service: google.maps.DistanceMatrixService)
  {

    //Step 1: Make a greedy station selection based on distance.
    let chosen_index: number = this.selectStation();
    if(chosen_index == -1)
    {
        return;
    }

    //Step 2: Ensure that the chosen station is unique in your optimal_stations.
    

  }


  getDistanceMatrix(origin_coords: google.maps.LatLng,
                    destination_coords: google.maps.LatLng,
                    places_service: google.maps.places.PlacesService,
                    directions_service: google.maps.DirectionsService,
                    directions_render_service: google.maps.DirectionsRenderer,
                    distance_matrix_service: google.maps.DistanceMatrixService)
  {
    //Create a copy of the station_objects array that only contains station coordinates.
    let way_points = [];
    for(let i=0; i<this.#station_objects.length; i++)
    {
      way_points.push(this.#station_objects[i].geometry);
    }

    let distanceMatrix_request: any = {
      origins: [origin_coords, destination_coords],
      destinations: way_points,
      travelMode: 'DRIVING'
    };

    distance_matrix_service.getDistanceMatrix(distanceMatrix_request, (results, status) => {

      if(status == google.maps.DistanceMatrixStatus.OK && results != null)
      {
        //Extract the distance/time to origin and distance/time to destination for each station.
        for(let i=0; i<this.#station_objects.length; i++)
        {
          let current_station = this.#station_objects[i];
          current_station.distance_to_origin = results.rows[0].elements[i].distance.value;
          current_station.time_to_origin = results.rows[0].elements[i].duration.value;
          
          current_station.distance_to_destination = results.rows[1].elements[i].distance.value;
          current_station.time_to_destination = results.rows[1].elements[i].duration.value;
        }

        //Construct the route by selecting the optimal stations.
        this.constructRoute(origin_coords,
                            destination_coords,
                            places_service,
                            directions_service,
                            directions_render_service,
                            distance_matrix_service);
      }
      else
      {
        alert("Error 4: Couldn't compute distance matrix for specified stations.");
      }

    });



  }


  findStation(origin_coords: google.maps.LatLng,
              destination_coords: google.maps.LatLng,
              places_service: google.maps.places.PlacesService,
              directions_service: google.maps.DirectionsService,
              directions_render_service: google.maps.DirectionsRenderer,
              distance_matrix_service: google.maps.DistanceMatrixService)
  {
    //Search for charging/gas stations within a current_range radius of the origin.
    let search_request = {
      location: origin_coords,
      query: this.#fuel_queries.get(this.#fuel_type),
      radius: this.#current_vehicle_range
    };

    //Returns an array of all matches within the radius.
    places_service.textSearch(search_request, (results, status) => {
      
      if(status == google.maps.places.PlacesServiceStatus.OK && results != null)
      {
        let num_chargers = results.length;
        this.#station_objects = [];

        for (let i=0; i<num_chargers; i++) {
          let current_station: station_object = {
            place_id: results[i].place_id,
            name: results[i].name,
            rating: results[i].rating,
            address: results[i].formatted_address,
            geometry: results[i].geometry?.location,
            distance_to_origin: 0,
            time_to_origin: 0,
            distance_to_destination: 0,
            time_to_destination: 0
          }
          this.#station_objects.push(current_station);
        }

        this.getDistanceMatrix(origin_coords,
                               destination_coords,
                               places_service,
                               directions_service,
                               directions_render_service,
                               distance_matrix_service);
      }
      else
      {
        alert("Error 3: Couldn't find any stations in the specified radius.");
      }
    });
  }


  stationRequired()
  {
    return (this.#current_vehicle_range <= this.#journey_distance); //Journey distance must be less than the current_range for direct routing. 
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
        let start_address = results.routes[0].legs[0].start_address;
        let stop_address = results.routes[0].legs[0].end_address;
        console.log(`The distance from ${start_address} to ${stop_address} is ${this.#journey_distance} meters.\n`);
        console.log(`Your vehicle's current range is ${this.#current_vehicle_range} meters.\n`);

        //Determine whether station-stops are needed.
        if(this.stationRequired())
        {
          //Recursively append charging/gas stations until destination is within current_range.
          this.findStation(origin_coords,
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
        alert("Error 2: Couldn't get directions from the origin to the destination.")
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
        alert("Error 1: Couldn't find the specified origin.");
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
        alert("Error 1: Couldn't find the specified destination.");
      }
      this.#destination_ready = true;
    });

  }


  constructJourney(data: journey_data,
                   fuel_type: string, 
                   places_service: google.maps.places.PlacesService,
                   directions_service: google.maps.DirectionsService,
                   directions_render_service: google.maps.DirectionsRenderer,
                   distance_matrix_service: google.maps.DistanceMatrixService)
  {
    //Step #1: Use the places API to find the location corresponding to the input strings.
    this.getPlacesData(data, places_service);
    
    this.#max_vehicle_range = (parseInt(data.range_string)*1000);
    this.#current_vehicle_range = this.#max_vehicle_range;
    this.#fuel_type = fuel_type;
    this.waitForPlaces(places_service, directions_service, directions_render_service, distance_matrix_service);

  }

}
