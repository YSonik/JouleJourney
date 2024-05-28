import { Component, Output, EventEmitter, OnInit } from '@angular/core';

type journey_data = {
  origin_string: string;
  destination_string: string;
  range_string: string;
}

@Component({
  selector: 'app-journey-search',
  templateUrl: './journey-search.component.html',
  styleUrl: './journey-search.component.css'
})
export class JourneySearchComponent implements OnInit{
  @Output() create_journey_event = new EventEmitter<journey_data>(); 
  #origin_element!:HTMLInputElement;
  #destination_element!:HTMLInputElement;
  #range_element!:HTMLInputElement;

  request_journey()
  {
    //Extract the values from the three input fields.
    let data: journey_data = {
      origin_string: this.#origin_element.value,
      destination_string: this.#destination_element.value,
      range_string: this.#range_element.value
    };

    //Emit the create_journey event to the map component.
    this.create_journey_event.emit(data);
  }

  ngOnInit()
  {
    this.#origin_element = (document.getElementById("origin_input") as HTMLInputElement);
    this.#destination_element = (document.getElementById("destination_input") as HTMLInputElement);
    this.#range_element = (document.getElementById("range_input") as HTMLInputElement);
  }

}
