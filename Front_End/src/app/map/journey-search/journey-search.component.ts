import { Component, Output, EventEmitter, OnInit } from '@angular/core';

type journey_data = {
  origin_string: string;
  destination_string: string;
  range_string: string;
};

type fuel_data = {
  fuel_type: string;
};

@Component({
  selector: 'app-journey-search',
  templateUrl: './journey-search.component.html',
  styleUrl: './journey-search.component.css'
})
export class JourneySearchComponent implements OnInit{
  @Output() create_journey_event = new EventEmitter<journey_data>();
  @Output() change_fuel_event = new EventEmitter<fuel_data>(); 
  #origin_element!:HTMLInputElement;
  #destination_element!:HTMLInputElement;
  #range_element!:HTMLInputElement;
  #fuel_button!: HTMLInputElement;
  #journey_search_element!: HTMLElement;
  #app_element!: HTMLElement;

  requestChangeFuel()
  {
    //Change the background-color of the app-component and journey-search-component based on the "checked" attribute.
    let data: fuel_data = {fuel_type: ""};
    
    if(this.#fuel_button.checked == true)
    {
      //app-component
      this.#app_element.style.backgroundColor = "#E57373"; //Light red
      
      //journey-search-component
      this.#journey_search_element.style.backgroundColor = "#E57373"; //Light red

      data.fuel_type = "gasoline";
    }
    else
    {
      //app-component
      this.#app_element.style.backgroundColor = "#78AADF"; //Light steel gray

      //journey-search-component
      this.#journey_search_element.style.backgroundColor = "#78AADF"; //Light steel gray

      data.fuel_type = "electricity";
    }

    //Emit the change_fuel event.
    this.change_fuel_event.emit(data);
  }

  requestJourney()
  {
    //Extract the values from the three input fields.
    let data: journey_data = {
      origin_string: this.#origin_element.value,
      destination_string: this.#destination_element.value,
      range_string: this.#range_element.value
    };

    //Input Validation
    let range_input = parseInt(data.range_string);
    if(range_input < 100 || range_input > 1000)
    {
      alert("Please enter a valid vehicle range between 100 and 1000 KM.");
      return;
    }

    //Emit the create_journey event to the map component.
    this.create_journey_event.emit(data);
  }

  ngOnInit()
  {
    this.#origin_element = (document.getElementById("origin_input") as HTMLInputElement);
    this.#destination_element = (document.getElementById("destination_input") as HTMLInputElement);
    this.#range_element = (document.getElementById("range_input") as HTMLInputElement);
    this.#fuel_button = (document.getElementById("fuel_button") as HTMLInputElement);
    this.#journey_search_element = (document.getElementById("embedded_search") as HTMLElement);
    this.#app_element = (document.getElementById("root_component") as HTMLElement);
  }

}
