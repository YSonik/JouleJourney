import { Injectable, computed } from '@angular/core';

type journey_data = {
  origin_string: string;
  destination_string: string;
  range_string: string;
};

type station_object = {
  place_id: any;
  name: any;
  rating: any;
  address: any;
  geometry: any;
  distance_to_origin: any; //Origin
  distance_to_destination: any; //Destination
};

type trip_summary = {
  trip_distance: any;
  trip_duration: any;
  stations_visited: any;
  time_spent_at_stations: any;
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
  
  #current_vehicle_range!: number;
  #journey_distance!: any;
  
  #fuel_type = "electricity";
  #fuel_queries = new Map([
    ["electricity", 'electric vehicle charging station'],
    ["gasoline", 'gasoline']
  ]);
  
  //Google Services
  #map_object!: google.maps.Map;
  #places_service!: google.maps.places.PlacesService;
  #directions_service!: google.maps.DirectionsService;
  #directions_render_service!: google.maps.DirectionsRenderer;
  #distance_matrix_service!: google.maps.DistanceMatrixService;

  //Custom markers
  #custom_icons !: any;
  #custom_markers: google.maps.Marker[] = [];
  #info_window!: google.maps.InfoWindow; 

  //Trip summary object
  #trip_summary_ready: boolean = false;
  #trip_summary!: trip_summary;

  constructor() 
  { 
    this.#origin_ready = false;
    this.#destination_ready = false;
  }


  getTripSummary()
  {
    if(this.#trip_summary_ready)
    {
      return this.#trip_summary;
    }
    else
    {
      return false;
    }
  }


  computeTripSummary(route_object: google.maps.DirectionsRoute)
  {
    //Store the stations visited.
    let trip_leg_count = route_object.legs.length;
    this.#trip_summary.stations_visited = (trip_leg_count-1);

    //Compute the time spent at stations.
    if(this.#fuel_type === "electricity")
    {
      this.#trip_summary.time_spent_at_stations = (this.#trip_summary.stations_visited * 50);
    }
    else
    {
      this.#trip_summary.time_spent_at_stations = (this.#trip_summary.stations_visited * 10);
    }

    //Compute the trip_distance and trip_duration.
    for(let i=0; i<trip_leg_count; i++)
    {
      //Accumulate trip_distance.
      this.#trip_summary.trip_distance += route_object.legs[i].distance?.value;

      //Accumulate trip_duration.
      this.#trip_summary.trip_duration += route_object.legs[i].duration?.value;
    }
    this.#trip_summary.trip_distance = Math.round(this.#trip_summary.trip_distance/1000);
    this.#trip_summary.trip_duration = Math.round(this.#trip_summary.trip_duration/60);

    this.#trip_summary_ready = true;
  }


  clearCustomMarkers()
  {
    this.#custom_markers.forEach((marker)=>{
      marker.setMap(null);
    });
  }


  createCustomMarkers(sparse_stations: station_object[])
  {
    //Origin
    let origin_marker = new google.maps.Marker({
      position: this.#origin_data.geometry.location,
      map: this.#map_object,
      icon: this.#custom_icons.get("origin"),
      title: `${this.#origin_data.name}|${this.#origin_data.address}`
    });
    this.#custom_markers.push(origin_marker);

    //Destination
    let destination_marker = new google.maps.Marker({
      position: this.#destination_data.geometry.location,
      map: this.#map_object,
      icon: this.#custom_icons.get("destination"),
      title: `${this.#destination_data.name}|${this.#destination_data.address}`
    });
    this.#custom_markers.push(destination_marker);

    //Stations
    sparse_stations.forEach((station)=>{
      let station_marker = new google.maps.Marker(
        {
          position: station.geometry,
          map: this.#map_object,
          icon: this.#custom_icons.get(this.#fuel_type),
          title: `${station.name}|${station.address}`
        }
      );
      this.#custom_markers.push(station_marker);
    });

    //Display an infoWindow when a marker is clicked.
    this.#custom_markers.forEach((marker)=>{
      let marker_title:any = marker.getTitle();
      let marker_attributes = marker_title.split("|");
      marker.addListener('click', ()=>{
        this.#info_window.setContent(`<p>Name: ${marker_attributes[0]}<br>Address: ${marker_attributes[1]}</p>`);
        this.#info_window.open(this.#map_object, marker);
      });
    });
  }


  renderRoute(optimal_stations: station_object[])
  {
    //Step 1: Create a waypoints array using the optimal stations.
    let way_points = [];
    for(let i=0; i<optimal_stations.length; i++)
    {
      way_points.push({
        location: optimal_stations[i].geometry,
        stopover: true
      });
    } 
    
    //Step 3: Create a directions request that include the origin, stations and destination.
    let directions_request: any = {
      origin: this.#origin_data.geometry.location,
      destination: this.#destination_data.geometry.location,
      waypoints: way_points,
      travelMode: 'DRIVING',
      provideRouteAlternatives: false
    };

    //Step 4: Use the directions service to compute the final route and render the results.
    this.#directions_service.route(directions_request, (results, status) => {
      if(status == google.maps.DirectionsStatus.OK && results != null)
      {
        this.#directions_render_service.setDirections(results);

        //Use the custom markers to display the route.
        this.createCustomMarkers(optimal_stations);

        //Compute the trip summary stats.
        this.computeTripSummary(results.routes[0]);
      }
      else
      { 
        alert("Error 5: Couldn't compute the final route.")
        return;
      }
    });
  }


  optimalStations(station_objects: station_object[])
  {
    let num_stations = station_objects.length;
    let optimal_stations: station_object[] = []
    let current_station = 0;
    let travelled_value = 0;

    if(num_stations >= 2)
    {
      while(current_station<num_stations)
      {
        //Edge Case: the last station is too far from the destination.
        if(current_station == (num_stations-1))
        {
          if(optimal_stations.length == 0)
          {
            optimal_stations.push(station_objects[current_station]);
          }
          else if(optimal_stations[optimal_stations.length-1].distance_to_destination > this.#current_vehicle_range)
          {
            optimal_stations.push(station_objects[current_station]);
          }
          current_station+=1; 
        }
        else if(station_objects[current_station].distance_to_origin < ((this.#current_vehicle_range*0.5) + travelled_value))
        {
          current_station+=1;
        }
        else
        {
          //Edge Case: No route possible due to insufficient stations.
          if(current_station == 0 &&
             station_objects[current_station].distance_to_origin > (this.#current_vehicle_range + travelled_value)
          )
          {
            return null;
          }
          else
          {
            let chosen_station = station_objects[current_station];
            optimal_stations.push(chosen_station);
            travelled_value = (chosen_station.distance_to_origin);
            current_station+=1;
          }
        }
      }

      //Edge Case: No route possible due to insufficient stations.
      let selected_stations = optimal_stations.length;
      if(selected_stations == 0)
      {
        return null;
      }
      else if(optimal_stations[selected_stations-1].distance_to_destination > this.#current_vehicle_range)
      {
        return null;
      }
      else
      {
        return optimal_stations; 
      }
    }
    else
    {
      return station_objects;
    }
  }


  constructRoute(origin_coords: google.maps.LatLng,
                 destination_coords: google.maps.LatLng,
                 station_objects: station_object[])
  {
    //Step 1: Sort the station_objects by ascending distance_to_origin.
    station_objects.sort((a,b)=> a.distance_to_origin - b.distance_to_origin);
    
    
    //Step 2: Make a greedy station selection based on distance_to_origin.
    let optimal_stations: station_object[]|null = this.optimalStations(station_objects);

    //Need to perform sparseStation extraction.(And ensure no distance between chargers is greater than current_vehicle_range).


    if(optimal_stations == null)
    {
      alert("No Route 1: No route possible due to insufficient stations. Try extending the vehicle range.");
      return;
    }
    
    //The route is complete, we can render it on the map. 
    this.renderRoute(optimal_stations); 
  }


  getDistanceMatrix(origin_coords: google.maps.LatLng,
                    destination_coords: google.maps.LatLng,
                    station_objects: station_object[])
  {
    //Create a copy of the station_objects array that only contains station coordinates.
    let way_points = [];
    for(let i=0; i<station_objects.length; i++)
    {
      way_points.push(station_objects[i].geometry);
    }

    let distanceMatrix_request: any = {
              //Origin,        Destination
      origins: [origin_coords, destination_coords],
      destinations: way_points,
      travelMode: 'DRIVING'
    };

    this.#distance_matrix_service.getDistanceMatrix(distanceMatrix_request, (results, status) => {

      if(status == google.maps.DistanceMatrixStatus.OK && results != null)
      {
        //Extract the distance/time to origin and distance/time to destination for each station.
        for(let i=0; i<station_objects.length; i++)
        {
          let current_station = station_objects[i];
          current_station.distance_to_origin = results.rows[0].elements[i].distance.value;
          current_station.distance_to_destination = results.rows[1].elements[i].distance.value;
        }

        //Construct the route by selecting the optimal stations.
        this.constructRoute(origin_coords,
                            destination_coords,
                            station_objects);
      }
      else
      {
        alert("Error 4: Couldn't compute distance matrix for specified stations.");
      }
    });
  }

  expandBounds(bounds: google.maps.LatLngBounds, expansionFactor: number) {
    let sw = bounds.getSouthWest();
    let ne = bounds.getNorthEast();

    let latDiff = (ne.lat() - sw.lat()) * expansionFactor;
    let lngDiff = (ne.lng() - sw.lng()) * expansionFactor;
    
    //Expand the northEast and southWest coordinates of the existing bounds.
    let newSw = new google.maps.LatLng(sw.lat() - latDiff, sw.lng() - lngDiff);
    let newNe = new google.maps.LatLng(ne.lat() + latDiff, ne.lng() + lngDiff);

    let expandedBounds = new google.maps.LatLngBounds(newSw, newNe);
    return expandedBounds;
  }

  findStation(origin_coords: google.maps.LatLng,
              destination_coords: google.maps.LatLng)
  {
    //Create a rectangular bound that contains the origin and the destination.
    let search_bounds: google.maps.LatLngBounds = new google.maps.LatLngBounds(origin_coords);
    search_bounds.extend(destination_coords);

    //Expand the bounds by an expansion factor of 10%.
    search_bounds = this.expandBounds(search_bounds, 0.1);
    
    //Visualize the bounds
    // let bound_marker = new google.maps.Rectangle({
    //   bounds:search_bounds,
    //   editable:false,
    //   draggable:false,
    //   map: this.#map_object
    // }); 

    //Search for charging/gas stations within the rectangular search bounds.
    let search_request = {
      query: this.#fuel_queries.get(this.#fuel_type),
      bounds: search_bounds
    };

    //Returns an array of all matches within the radius.
    this.#places_service.textSearch(search_request, (results, status) => {
      
      if(status == google.maps.places.PlacesServiceStatus.OK && results != null)
      {
        let num_chargers = results.length;
        let station_objects = [];

        for (let i=0; i<num_chargers; i++) {
          let current_station: station_object = {
            place_id: results[i].place_id,
            name: results[i].name,
            rating: results[i].rating,
            address: results[i].formatted_address,
            geometry: results[i].geometry?.location,
            distance_to_origin: 0,
            distance_to_destination: 0
          }
          station_objects.push(current_station);
        }
        
        //Ensure the distance matrix remains cost effective.
        if(station_objects.length > 20)
        {
          //alert(`${station_objects.length} stations were found, but the algorithm will only consider the first 10.`);
          station_objects.length = 20;
        }
        this.getDistanceMatrix(origin_coords,
                               destination_coords,
                               station_objects);
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
                  destination_coords: google.maps.LatLng)
  {
    let directions_request: any = {
      origin: origin_coords,
      destination: destination_coords,
      provideRouteAlternatives: false,
      travelMode: 'DRIVING'
    };

    this.#directions_service.route(directions_request, (results, status) =>{
      
      if(status == google.maps.DirectionsStatus.OK && results != null)
      { 
        //Extract the journey distance from the result.
        this.#journey_distance = results.routes[0].legs[0].distance?.value;
        let start_address = results.routes[0].legs[0].start_address;
        this.#origin_data["address"] = start_address;

        let stop_address = results.routes[0].legs[0].end_address;
        this.#destination_data["address"] = stop_address;

        console.log(`The distance from ${start_address} to ${stop_address} is ${this.#journey_distance} meters.\n`);
        console.log(`Your vehicle's current range is ${this.#current_vehicle_range} meters.\n`);

        //Determine whether station-stops are needed.
        if(this.stationRequired())
        {
          //Search for charging/gas stations and try to construct a valid route.
          this.findStation(origin_coords,
                           destination_coords);
        }
        else
        {
          //Render the direct route.
          this.renderRoute([]);
        }
      }
      else
      {
        alert("Error 2: Couldn't get directions from the origin to the destination.")
      }
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
      if(this.#origin_data == null || this.#destination_data == null)
      {
        return;
      }
      else
      {
        this.computeDistance(this.#origin_data.geometry.location, 
                             this.#destination_data.geometry.location);
      }
    }
    else
    {
      setTimeout(()=>{this.waitForPlaces();}, 100);
    }
  }


  getPlacesData(data: journey_data)
  {
    //You can get photos as fields.
    let origin_request = {
      query: data.origin_string,
      fields: ['name','geometry']
    }
    this.#places_service.findPlaceFromQuery(origin_request, (results, status)=>{

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
    this.#places_service.findPlaceFromQuery(destination_request, (results, status)=>{

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
                   map_object: google.maps.Map,
                   custom_icons: any,
                   info_window: google.maps.InfoWindow,  
                   places_service: google.maps.places.PlacesService,
                   distance_matrix_service: google.maps.DistanceMatrixService,
                   directions_service: google.maps.DirectionsService,
                   directions_render_service: google.maps.DirectionsRenderer)
  { 
    //Clear the custom_markers and trip_summary
    this.clearCustomMarkers();
    this.#trip_summary_ready = false;
    this.#trip_summary = {
      trip_distance: 0,
      trip_duration: 0,
      stations_visited: 0,
      time_spent_at_stations: 0
    };

    //Update member variables with received parameters.
    this.#current_vehicle_range = (parseInt(data.range_string)*1000);
    this.#fuel_type = fuel_type;
    this.#map_object = map_object;
    this.#custom_icons = custom_icons;
    this.#info_window = info_window;
    this.#places_service = places_service;
    this.#directions_service = directions_service;
    this.#directions_render_service = directions_render_service;
    this.#distance_matrix_service = distance_matrix_service;

    //Step #1: Use the places API to find the location corresponding to the input strings.
    this.getPlacesData(data);
    this.waitForPlaces();
  }

}
