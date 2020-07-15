(function($){
/**
 * iNaturalist map object
 * Copyright (c) iNaturalist, 2007-2008
 * 
 * @created: 2008-01-01
 * @updated: 2008-04-12
 * @author: n8agrin
 * @author: kueda
 */

// requires GoogleMap classes
if (typeof(google) == 'undefined' || typeof(google.maps) == 'undefined') throw "The Google Maps libraries must be loaded to use the iNaturalist Map extensions.";

var deselectText = function() {
  if (window.getSelection) {
    if (window.getSelection().empty) {  // Chrome
      window.getSelection().empty();
    } else if (window.getSelection().removeAllRanges) {  // Firefox
      window.getSelection().removeAllRanges();
    }
  } else if (document.selection) {  // IE
    document.selection.empty();
  }
};

var emptyLayer = new google.maps.ImageMapType({
  tileSize: new google.maps.Size(256, 256),
  getTileUrl: function(tile, zoom) { }
});


google.maps.Map.prototype.createMarker = function(lat, lng, options) {
  options = options || {}
  options.position = new google.maps.LatLng(lat, lng)
  return new google.maps.Marker(options);
};
  
// remove a single marker
google.maps.Map.prototype.removeMarker = function(marker) {
  // gracefully clear the listeners out of memory
  google.maps.event.clearInstanceListeners(marker);
  
  // remove the marker from the map
  marker.setMap(null);
  this.removeOverlay(marker);
};
  
google.maps.Map.prototype.addNewCenteredMarker = function(options) {
  return this.addNewUnsavedMarker(this.getCenter().lat(),
                                  this.getCenter().lng(),
                                  options);
};
  
google.maps.Map.prototype.addNewUnsavedMarker = function(lat, lng, options) {
  this.removeLastUnsavedMarker();
  this.lastUnsavedMarker = this.createMarker(lat, lng, options);
  this.lastUnsavedMarker.setMap(this);
  return this.lastUnsavedMarker;
};
  
// Call this to remove the marker object from the lastUnsavedMarker value in the
// iNaturalist.Map object.  This is usually used when canceling input into
// a form, or when the lastUnsavedMarker object needs to be cleared out.
google.maps.Map.prototype.removeLastUnsavedMarker = function() {
  if (this.lastUnsavedMarker) {
    this.removeMarker(this.lastUnsavedMarker);
    this.lastUnsavedMarker = null;
    return true;
  }
  return false;
};
  
// addObservation adds the observation to the map and tacks a marker
// obejct onto the Observation object.  This assumes the observation has
// already been saved.  Use addUnsavedMarker above if you need to add
// a single marker to the map in an unsaved state.
google.maps.Map.prototype.addObservation = function(observation, options) {
  options = options || {}
  
  // Use private coords if they're there.  It's up to the json provider to 
  // filter this out.
  var lat = observation.private_latitude || observation.latitude,
      lon = observation.private_longitude || observation.longitude
  
  // Can't add an obs w/o coordinates
  if (!lat || !lon) return false;

  if (!options.icon) {
    options.icon = iNaturalist.Map.createObservationIcon({observation: observation});
  }
  
  var marker = this.createMarker(lat, lon, options);
  
  // store the marker for later use, or for easy removing
  this.observations[observation.id] = marker;
  
  // build a generic marker infowindow
  if (typeof(options.clickable) == 'undefined' || options.clickable != false) {
    marker.message = this.buildObservationInfoWindow(observation);
    
    // add a click handler to the marker so that one can keep track of it.
    google.maps.event.addListener(marker, 'click', this.openInfoWindow)
  };
  
  var bounds = this.getObservationBounds();
  bounds.extend(new google.maps.LatLng(lat, lon));
  this.setObservationBounds(bounds);
  
  // add the marker to the map
  marker.setMap(this);
  observation.marker = marker;
  if (options.showAccuracy && 
      (observation.coordinates_obscured || (observation.positional_accuracy && observation.positional_accuracy > 0))) {
    var iconicTaxonName = observation.iconic_taxon_name
    if (!iconicTaxonName && observation.iconic_taxon) iconicTaxonName = observation.iconic_taxon.name;
    if (!iconicTaxonName && observation.taxon) iconicTaxonName = observation.taxon.iconic_taxon_name;
    var color = iconicTaxonName ? iNaturalist.Map.ICONIC_TAXON_COLORS[iconicTaxonName] : '#333333';
    var shape;
    var shapeOptions = {
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.35,
      map: this
    };
    if( observation.coordinates_obscured ) {
      shape = markerObscuredRectangle( marker, shapeOptions );
    } else {
      var accuracy = parseInt( observation.positional_accuracy ) || 0;
      if( accuracy == 0 ) return
      shape = new google.maps.Circle( window.lodash.extend( shapeOptions, {
        center: marker.getPosition( ),
        radius: accuracy
      }));
      observation._circle = shape;
    }
    var listener = function() {
      var mapBounds = this.getBounds(),
          shapeBounds = shape.getBounds()
      if (mapBounds && shapeBounds.contains(mapBounds.getNorthEast()) && shapeBounds.contains(mapBounds.getSouthWest())) {
        shape.setVisible(false)
      } else {
        shape.setVisible(true)
      }
    }
    google.maps.event.addListener(this, 'zoom_changed', listener)
    google.maps.event.addListener(this, 'bounds_changed', listener)
  }
  
  // return the observation for futher use
  return observation;
};
  
google.maps.Map.prototype.removeObservation = function(observation) {
  this.removeMarker(this.observations[observation.id]);
  if (this.observations[observation.id]) {
    this.observations[observation.id].setMap(null)
  }
  delete this.observations[observation.id];
};
  
google.maps.Map.prototype.addObservations = function(observations, options) {
  var map = this;
  $.each(observations, function() {
    var success = map.addObservation(this, options);
  });
};
  
// remove many observations from a list of observations
google.maps.Map.prototype.removeObservations = function(observations) {
  var map = this;
  if (typeof(observations) == "undefined") {
    $.each(map.observations, function(k,v) {
      map.removeObservation( { id: k } );
      delete map.observationBounds
    });
  } else {
    $.each(observations, function() {
      map.removeObservation(this);
    });
  }
};

google.maps.Map.prototype.getObservationBounds = function() {
  if (!this.observationBounds) {
    this.observationBounds = new google.maps.LatLngBounds()
  }
  return this.observationBounds
};

google.maps.Map.prototype.setObservationBounds = function(bounds) {
  this.observationBounds = bounds;
};

google.maps.Map.prototype.zoomToObservations = function() {
  this.fitBounds(this.getObservationBounds())
};

google.maps.Map.prototype.addPlaces = function(places) {
  for (var i = places.length - 1; i >= 0; i--){
    this.addPlace(places[i])
  }
}
google.maps.Map.prototype.addPlace = function(place, options) {
  if (typeof(options) == 'undefined') { var options = {} };
  
  if (typeof(options.icon) == 'undefined') {
    options.icon = iNaturalist.Map.createPlaceIcon();
  };
  var marker = this.createMarker(place.latitude, place.longitude, options);
  
  this.places[place.id] = marker;
  
  // If this is the first, set the bounds to the extent of the place.
  var placesLength = 0;
  for(var key in this.places) placesLength += 1;
  
  if (placesLength == 1 && place.swlat != null && place.swlat != '') {
    var bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(place.swlat, place.swlng), 
      new google.maps.LatLng(place.nelat, place.nelng));
  }
  // Otherwise just extend the bounds
  else {
    var bounds = this.getPlaceBounds()
    if (place.swlat) {
      bounds.extend(new google.maps.LatLng(place.swlat, place.swlng))
      bounds.extend(new google.maps.LatLng(place.nelat, place.nelng))
    } else {
      bounds.extend(new google.maps.LatLng(place.latitude, place.longitude))
    }
  }
  this.setPlaceBounds(bounds);
  
  // add the marker to the map
  marker.setMap(this);
  place.marker = marker;
  
  // return the place for futher use
  return place;
}

// Zooms to place boundaries, adds kml if available
google.maps.Map.prototype.setPlace = function(place, options) {
  options = options || {}
  if (place.swlat) {
    var bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(place.swlat, place.swlng),
      new google.maps.LatLng(place.nelat, place.nelng)
    )
    this.fitBounds(bounds)
  } else {
    this.setCenter(new google.maps.LatLng(place.latitude, place.longitude));
  }
}

google.maps.Map.prototype.removePlace = function(place) {
  if (this.places[place.id]) {
    this.removeMarker(this.places[place.id]);
    delete this.places[place.id];
  }
}
google.maps.Map.prototype.removePlaces = function(places) {
  var map = this;
  if (typeof(places) == 'undefined') {
    $.each(map.places, function() {
      map.removeMarker(this);
      delete this;
    });
  } else {
    $.each(places, function() {
      map.removePlace(this);
    });
  }
  this.placeBounds = new google.maps.LatLngBounds();
}
google.maps.Map.prototype.zoomToPlaces = function() {
  this.fitBounds(this.getPlaceBounds())
}
google.maps.Map.prototype.getPlaceBounds = function() {
  if (typeof(this.placeBounds) == 'undefined') {
    this.placeBounds = new google.maps.LatLngBounds();
  };
  return this.placeBounds;
}
google.maps.Map.prototype.setPlaceBounds = function(bounds) {
  this.placeBounds = bounds;
}

// infoWindowOpenTime will be set to prevent native Google Maps events to
// conflict with wax.g / utfGrid interactions. We'll make sure no wax.g
// interactions fire shortly after a native event is initiated. We had a bug
// where markers on top of utfGrid zones were opening two windows
var infoWindowOpenTime;
google.maps.Map.prototype.openInfoWindow = function(e) {
  infoWindowOpenTime = new Date( );
  // close any infowindows opened by wax.g
  if( window.map && window.map.infoWindow ) {
    window.map.infoWindow.close( );
  }
  iNaturalist.Map.infoWindow = iNaturalist.Map.infoWindow || new google.maps.InfoWindow()
  iNaturalist.Map.infoWindow.setContent(this.message)
  iNaturalist.Map.infoWindow.open(this.map, this)
};

google.maps.Map.prototype.buildObservationInfoWindow = function(observation) {  
  // First see if we can find an observation component for this observation
  var existing = document.getElementById('observation-'+observation.id);
  if (typeof(existing) != 'undefined' && existing != null) {
    var infowinobs = $(existing).clone().get(0);
    $(infowinobs).find('.details').show();
    var wrapper = $('<div class="compact mini infowindow observations"></div>').append(infowinobs);
    return $(wrapper).get(0);
  };
  
  var wrapper = $('<div class="observation"></div>');
  var photoURL
  if (typeof(observation.image_url) != 'undefined' && observation.image_url != null) {
    photoURL = observation.image_url
  } else if (typeof(observation.obs_image_url) != 'undefined' && observation.obs_image_url != null) {
    photoURL = observation.obs_image_url
  } else if (typeof(observation.photos) != 'undefined' && observation.photos.length > 0) {
    photoURL = observation.photos[0].square_url
  }
  if (photoURL) {
    wrapper.append(
      $('<img width="75" height="75"></img>').attr('src', photoURL).addClass('left')
    );
  }
  
  wrapper.append(
    $('<div class="readable attribute inlineblock"></div>').append(
      $('<a href="/observations/'+observation.id+'"></a>').append(
        observation.species_guess
      )
    )
  );
  if (observation.user) {
    wrapper.append(
      ', by ',
      $('<a href="/people/'+observation.user.login+'"></a>').append(
        observation.user.login
      )
    )
  }else if(typeof(observation.identifications) != 'undefined' && observation.identifications.length > 0){
    if( typeof(observation.identifications[0].user) != 'undefined' ){
      wrapper.append(
        ', by ',
        $('<a href="/people/'+observation.identifications[0].user.login+'"></a>').append(
          observation.identifications[0].user.login
        )
      )
    }
  }
 
  if (typeof(observation.short_description) != 'undefined' && observation.short_description != null) {
    wrapper.append($('<div class="description"></div>').append(observation.short_description));
  } else {
    wrapper.append($('<div class="description"></div>').append(observation.description));
  }
  
  wrapper = $('<div class="compact observations mini infowindow"></div>').append(wrapper);
  
  return wrapper.get(0);
};

if (typeof iNaturalist === 'undefined') this.iNaturalist = {};

if (typeof iNaturalist.Map === 'undefined') this.iNaturalist.Map = {};

iNaturalist.Map.MAP_BACKGROUND_COLOR = '#B3D1FF'
iNaturalist.Map.SATELLITE_BACKGROUND_COLOR = '#2A4280'

// Map styles
iNaturalist.Map.MapTypes = {};
iNaturalist.Map.MapTypes.LIGHT = "light";
iNaturalist.Map.MapTypes.light = new google.maps.StyledMapType([
  {
    stylers: [
      {lightness: 50},
      {saturation: -50}
    ]
  }
], {name: "Map"});
iNaturalist.Map.MapTypes.LIGHT_NO_LABELS = "light_no_labels";
iNaturalist.Map.MapTypes.light_no_labels = new google.maps.StyledMapType([
  {
    stylers: [
      {lightness: 50},
      {saturation: -50}
    ]
  },
  {
    featureType: "all",
    elementType: "labels",
    stylers: [ { visibility: "off" } ]
  }
], {name: "Map (no labels)"});

// static functions
iNaturalist.Map.createMap = function(options) {
  options = options || {}
  options = $.extend({}, {
    div: 'map',
    center: new google.maps.LatLng(options.lat || 0, options.lng || 0),
    zoom: 1,
    mapTypeId: google.maps.MapTypeId.TERRAIN,
    streetViewControl: false,
    rotateControl: false,
    backgroundColor: iNaturalist.Map.MAP_BACKGROUND_COLOR,
    clickableIcons: false,
    gestureHandling: "greedy",
    controlSize: 26,
    tilt: 0
  }, options);
  
  var map;
  
  if (typeof options.div == 'string') {
    map = new google.maps.Map(document.getElementById(options.div), options);
  }
  else {
    map = new google.maps.Map(options.div, options);
  }

  // extend parts of the Google Marker class
  map.observation_id = null;

  // A map consists of the map itself, plus methods on how to add Observations
  // javascript objects to the map and handle the updating of those objects
  // when an Observation is moved or editted.

  // storage for marker objects indexed by their corresponding
  // observation_id's
  map.observations = {};
  map.places = {};
      
  // used when creating observations from the map
  // TODO: make this more like a stack to help with handling multiple
  // unsaved markers
  map.lastUnsavedMarker = null;


  // general purpose infoWindow
  // stores a global scope reference to an infoWindow
  google.maps.Map.prototype.infoWindow = null;

  map.addListener('maptypeid_changed', function() {
    var mapTypeId = map.getMapTypeId();
    if (mapTypeId == google.maps.MapTypeId.SATELLITE || mapTypeId == google.maps.MapTypeId.HYBRID) {
      $(map.getDiv()).css({'backgroundColor': iNaturalist.Map.SATELLITE_BACKGROUND_COLOR})
    } else {
      $(map.getDiv()).css({'backgroundColor': map._inatMapBackgroundColor})
    }
  })
  map._inatMapBackgroundColor = options.backgroundColor || iNaturalist.Map.MAP_BACKGROUND_COLOR
  if ( !options.disableFullscreen ) {
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(new iNaturalist.FullScreenControl(map));
  }

  if (options.bounds) {
    if (typeof(options.bounds.getCenter) == 'function') {
      map.setBounds(options.bounds)
    } else {
      var bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(options.bounds.swlat, options.bounds.swlng),
        new google.maps.LatLng(options.bounds.nelat, options.bounds.nelng)
      )
      map.fitBounds(bounds)
    }
  }
  
  return map;
}

// The following code should be abstracted out a bit more
iNaturalist.Map.createPlaceIcon = function(options) {
  var options = options || {}
  var iconPath = "https://www.inaturalist.org/mapMarkers/mm_34_stemless_";
  iconPath += options.color ? options.color : "DeepPink"
  if (options.character) { iconPath += ('_' + options.character); }
  iconPath += '.png';
  var place = new google.maps.MarkerImage(iconPath);
  place.size = new google.maps.Size(20,20);
  place.anchor = new google.maps.Point(10,10);
  return place;
};

iNaturalist.Map.createObservationIcon = function(options) {
  if (typeof(options) == 'undefined') { var options = {} };
  
  var iconPath;
  
  // Choose the right settings for the observation's iconic taxon
  if (options.observation) {
    var iconSet = options.observation.coordinates_obscured ? 'STEMLESS_ICONS' : 'ICONS'
    var iconicTaxonIconsSet = options.observation.coordinates_obscured ? 'STEMLESS_ICONIC_TAXON_ICONS' : 'ICONIC_TAXON_ICONS'
    var iconicTaxonName = options.observation.iconic_taxon_name
    if (!iconicTaxonName && options.observation.iconic_taxon) {
      iconicTaxonName = options.observation.iconic_taxon.name;
    }
    if (!iconicTaxonName && options.observation.taxon) {
      iconicTaxonName = options.observation.taxon.iconic_taxon_name;
    }
    if (iconicTaxonName) {
      iconPath = window.lodash.clone( iNaturalist.Map[iconicTaxonIconsSet][iconicTaxonName] );
      if( options.observation.quality_grade != "research" ) {
        iconPath.url = iconPath.url.replace( /\.png$/, "NoDot.png" );
      }
    } else {
      iconPath = iNaturalist.Map[iconSet]['unknown34'];
    }
    if( options.observation.coordinates_obscured ) {
      iconPath.anchor = new google.maps.Point(10, 10);
    }
    return iconPath
  }
  
  iconPath = "https://www.inaturalist.org/mapMarkers/mm_34_"
  iconPath += options.stemless ? "stemless_" : ""
  iconPath += options.color || "HotPink"
  iconPath += options.character ? ('_'+options.character) : ""
  if( !options.character && options.quality_grade != "research" ) {
    iconPath += "NoDot";
  }
  iconPath += '.png'
  return iconPath
};

// Haversine distance calc, adapted from http://www.movable-type.co.uk/scripts/latlong.html
iNaturalist.Map.distanceInMeters = function(lat1, lon1, lat2, lon2) {
  var earthRadius = 6370997, // m 
      degreesPerRadian = 57.2958,
      dLat = (lat2-lat1) / degreesPerRadian,
      dLon = (lon2-lon1) / degreesPerRadian,
      lat1 = lat1 / degreesPerRadian,
      lat2 = lat2 / degreesPerRadian

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = earthRadius * c;
  
  return d
}

// return a default map type with an optional user
iNaturalist.Map.preferredMapTypeId = function( user ) {
  var mapTypeId = google.maps.MapTypeId.TERRAIN;
  if (
    user
    && user.preferred_observations_search_map_type
    && !window.lodash.isEmpty( user.preferred_observations_search_map_type )
  ) {
    if ( user.preferred_observations_search_map_type.match( /light/ ) ) {
      mapTypeId = google.maps.MapTypeId.ROADMAP;
    } else {
      mapTypeId = user.preferred_observations_search_map_type;
    }
  }
  return mapTypeId;
};

iNaturalist.FullScreenControl = function(map) {
  var controlDiv = document.createElement('DIV'),
      enter = '<span class="ui-icon ui-icon-extlink">Full screen</span>',
      exit = '<span class="ui-icon ui-icon-arrow-1-sw inlineblock"></span> ' + 'exit_full_screen'
  controlDiv.style.padding = '5px';
  var controlUI = $('<div></div>').html(enter).addClass('gmapv3control')
  controlDiv.appendChild(controlUI.get(0))

  var exitFullScreen = function() {
    var oldCenter = map.getCenter()
    $(this).html(enter).css('font-weight', 'normal')
    $(map.getDiv()).removeClass('fullscreen')
    google.maps.event.trigger(map, 'resize')
    map.setCenter(oldCenter)
  }

  window.fullscreenEscapeHandler = function(e) {
    if(e.keyCode === 27) {
      controlUI.click()
    }
    $(document).unbind('keyup', window.fullscreenEscapeHandler)
  }

  var enterFullScreen = function() {
    var oldCenter = map.getCenter()
    $(this).html(exit).css('font-weight', 'bold')
    $(map.getDiv()).addClass('fullscreen')
    google.maps.event.trigger(map, 'resize')
    map.setCenter(oldCenter)
    $(document).bind('keyup', window.fullscreenEscapeHandler)
  }
  controlUI.toggle(enterFullScreen, exitFullScreen)
  return controlDiv;
}

iNaturalist.legendItem = function( options ) {
  var li = $( "<li/>" );
  var iconDiv = $( "<div/>" ).addClass( "icon" );
  if( options.images ) {
    window.lodash.each( options.images, function( i ) {
      var icon = $( "<img/>" ).attr( "src", i );
      if( options.imageClasses ) {
        icon.addClass( options.imageClasses );
      }
      iconDiv.append( icon );
    });
  } else if( options.color ) {
    iconDiv.addClass( "color-box" ).css( "background", options.color );
  } else if( options.unknown === true ) {
    iconDiv.addClass( "color-box unknown" );
  }
  if( options.classes ) {
    li.addClass( options.classes );
  }
  var labelDiv = $( "<div/>" ).addClass( "label" ).text( options.label );
  return li.append( iconDiv ).append( labelDiv );
};

iNaturalist.LegendControl = function( controlDiv, map ) {
  var controlUI = $( "<div><div id='map-legend-label' class='gmap-label'>" + "Kartenlegende"  +"</div></div>" ).
    addClass( "gmapv3legend" );
  controlUI.click( function( ) {
    $( "#map-legend" ).toggle( );
    $( "#map-legend" ).focus( );
  });
  controlDiv.appendChild( controlUI.get(0) );
}


iNaturalist.Legend = function( controlDiv, map, options ) {
  options = options || {};
  var controlUI = $( "<div id='map-legend'><div class='title'>" + "Kartenlegende"  +"</div></div>" ).
    addClass( "gmapv3legend" ).hide( );
  var ulDiv = $( "<div></div>" ).addClass( "ul-container" );
  var ul1 = $( "<ul></ul>" ).addClass( "inat-overlay left" );
  ul1.append( $( "<li class='header'>" + "quality_grade"  +"</li>") );
  ul1.append( iNaturalist.legendItem({
    images: [ "https://www.inaturalist.org/map_legend/legend_lg_mm_research.png",
              "https://www.inaturalist.org/map_legend/legend_lg_mm_circle_research.png" ],
    label: "research_grade"  }));
  ul1.append( iNaturalist.legendItem({
    images: [ "https://www.inaturalist.org/map_legend/legend_lg_mm.png",
              "https://www.inaturalist.org/map_legend/legend_lg_mm_circle.png" ],
    label: [ "needs_id" , "casual"  ].join( ", " ),
    classes: "last" }));
  ul1.append( $( "<li class='header'>" + "geoprivacy"  +"</li>") );
  ul1.append( iNaturalist.legendItem({
    images: [ "https://www.inaturalist.org/map_legend/legend_lg_mm.png" ],
    label: "open"  }));
  ul1.append( iNaturalist.legendItem({
    images: [ "https://www.inaturalist.org/map_legend/legend_lg_mm_circle.png" ],
    label: "obscured" ,
    classes: "last" }));
  if (!options.hideFeatured) {
    ul1.append( $( "<li class='header'>" + "map_marker_size"  +"</li>") );
    ul1.append( iNaturalist.legendItem({
      images: [ "https://www.inaturalist.org/map_legend/legend_lg_mm_research.png",
                "https://www.inaturalist.org/map_legend/legend_lg_mm.png",
                "https://www.inaturalist.org/map_legend/legend_lg_mm_circle_research.png",
                "https://www.inaturalist.org/map_legend/legend_lg_mm_circle.png" ],
      imageClasses: "large",
      label: "featured" ,
      classes: "tall" }));
    ul1.append( iNaturalist.legendItem({
      images: [ "https://www.inaturalist.org/map_legend/legend_lg_mm_research.png",
                "https://www.inaturalist.org/map_legend/legend_lg_mm.png",
                "https://www.inaturalist.org/map_legend/legend_lg_mm_circle_research.png",
                "https://www.inaturalist.org/map_legend/legend_lg_mm_circle.png" ],
      imageClasses: "wide",
      label: "all" ,
      classes: "last" }));
  }
  ulDiv.append( ul1 );

  var ul2 = $( "<ul></ul>" ).addClass( "inat-overlay right" );
  ul2.append( $( "<li class='header'>" + "taxonomic_groups"  +"</li>") );
  ul2.append( iNaturalist.legendItem({
    color: iNaturalist.Map.ICONIC_TAXON_COLORS[ "Animalia" ],
    label: [ "all_taxa.amphibians" , "all_taxa.birds" ,
             "all_taxa.ray_finned_fishes" , "all_taxa.mammals" ,
             "all_taxa.reptiles" , "all_taxa.other_animals"  ].join( ", " ) }));
  ul2.append( iNaturalist.legendItem({
    color: iNaturalist.Map.ICONIC_TAXON_COLORS[ "Mollusca" ],
    label: [ "all_taxa.mollusks" , "all_taxa.arachnids" ,
             "all_taxa.insects"  ].join( ", " ) }));
  ul2.append( iNaturalist.legendItem({
    color: iNaturalist.Map.ICONIC_TAXON_COLORS[ "Plantae" ],
    label: "all_taxa.plants"  }));
  ul2.append( iNaturalist.legendItem({
    color: iNaturalist.Map.ICONIC_TAXON_COLORS[ "Fungi" ],
    label: "all_taxa.fungi"  }));
  ul2.append( iNaturalist.legendItem({
    color: iNaturalist.Map.ICONIC_TAXON_COLORS[ "Chromista" ],
    label: "all_taxa.chromista"  }));
  ul2.append( iNaturalist.legendItem({
    color: iNaturalist.Map.ICONIC_TAXON_COLORS[ "Protozoa" ],
    label: "all_taxa.protozoans"  }));
  ul2.append( iNaturalist.legendItem({
    unknown: true,
    label: "unknown"  }));
  ulDiv.append( ul2 );
  controlUI.append( ulDiv );
  controlDiv.appendChild( controlUI.get(0) );
}



iNaturalist.OverlayControl = function(map, options) {
  options = options || {}
  var controlDiv = options.div || document.createElement('DIV')
  controlDiv.style.margin = "6px 5px 0";
  var controlUI = $('<div><span class="ui-icon inat-icon ui-icon-layers">'+'taxon_map.overlays'+'</span></div>').addClass('gmapv3control overlaycontrol')
  var ul = $('<ul></ul>').addClass("inat-overlay").hide()
  controlUI.append(ul)
  controlUI.hover(function() {
    $(this).addClass('open')
    $('ul', this).show()
    $(this).parent().css('z-index', 1)
  }, function() {
    $(this).removeClass('open')
    $('ul', this).hide()
    $(this).parent().css('z-index', 0)
  })
  controlDiv.appendChild(controlUI.get(0))
  this.div = controlDiv
  this.map = map
  if (map.overlays) {
    for (var i=0; i < map.overlays.length; i++) {
      this.addOverlay(map.overlays[i])
    }
  }
  return this;
}

iNaturalist.OverlayControl.prototype.removeOverlayControl = function(title) {
  $("li[data-title='"+title+"']", this.div).remove()
}

iNaturalist.OverlayControl.prototype.removeAll = function( ) {
  $("li[data-title]", this.div).remove( );
  $("li[data-taxon-id]", this.div).remove( );
}

// Given an array of wax.g map layers (overlayMapTypes), add a single
// checkbox to the custom iNaturalist Overlays map control. That single
// checkbox can have custom title and description, and will toggle everything
// in `layers` at the same time. If the overlay was not previously displayed
// on the map, it will be added to the top-right corner of the map.
iNaturalist.OverlayControl.prototype.addWindshaftOverlayControl = function( layers, options ) {
  if( ! window.lodash.isArray( layers ) || layers.length === 0 ) { return; }
  var map = this.map,
      ul = $("ul", this.div),
      title = options.title || "Layer",
      id = "layer_" + layers[0].layerID,
      description = options.description,
      checkbox = $("<input type='checkbox'/>"),
      li = $("<li/>"),
      controlPosition = google.maps.ControlPosition[options.controlPosition] || google.maps.ControlPosition.TOP_RIGHT;
  if (options.taxon) {
    // Stopgap solution to dealing with multiple taxon maps on a single page.
    // Will break if multiple maps have the same taxon
    id += '-' + options.taxon.id + "-" + options.label;
  }
  li.attr('data-title', title)
  var label = $("<label/>").attr("for", id).html(title)
  if (options.hover) {
    label.attr('title', options.hover)
  }
  checkbox
    .attr("id", id)
    .attr("name", title)
    .attr("checked", ! options.disabled);
  var legendLeft = $( "<div class='legend-left' />" );
  legendLeft.append( checkbox );
  var legendRight = $( "<div class='legend-right' />" );
  legendRight.append( label );
  // Append an element to show the color of this layer in the legend. Note the
  // legend color can be specified independently of the layer color with
  // legendColor, otherwise it defaults to color
  var legendColor = options.legendColor || options.color;
  if ( legendColor ) {
    li.addClass( "with-legend-mark" );
    legendLeft.append(
      $( "<div class='legend-mark' />" ).css( { backgroundColor: legendColor } )
    );
  }
  li.append( legendLeft, legendRight );
  if( options.endpoint === "gbif" && options.gbif_id ) {
     label.append(
       " <a href='http://www.gbif.org/species/" + options.gbif_id + "' target='_blank'><i class='icon-link' /></a>"
     );
  }
  if( options.taxon ) {
    addWindshaftOverlayTaxonDiv( ul, li, options );
  }
  checkbox.change( function( e ) {
    var checked = $( this ).prop( "checked" );
    window.lodash.each( layers, function( layerData ) {
      map.overlayMapTypes.setAt( layerData.layerID - 1, checked ? layerData.layer : emptyLayer);
    });
    // if this checkbox belongs to a taxon, make sure that if this is the
    // last in the set unchecked, the taxon is also unchecked. And as soon
    // as one checkox is checked, the taxon's checkbox will also be checked
    if ( taxonID = $(this).parent().data( "taxon-id" ) ) {
      updateTaxonCheckboxState( ul, taxonID );
    }
    if ( typeof( options.onChange ) === "function" ) {
      options.onChange( e );
    }
  })
  if( description ) {
    legendRight.append($("<div/>").addClass("small meta").html( description ));
  }
  ul.append( li );
  updateCheckboxInteractions( ul );
  if( ! map._overlayControlDisplayed ) {
    map.controls[controlPosition].push(map._overlayControl.div);
    map._overlayControlDisplayed = true;
  }
};

// ensure the Windshaft overlay taxon entry's checkbox is in sync
// with all of its layers. If none of a taxon's layers are enabled
// then the taxon's checkbox should be un-checked
var updateTaxonCheckboxState = function( ul, taxonID ) {
  if( ul.find( "li.for_taxon[data-taxon-id='" + taxonID + "'] input:checked" ).length === 0 ) {
    ul.find( "li.taxon[data-taxon-id='" + taxonID + "'] input" ).prop( "checked", false );
  } else {
    ul.find( "li.taxon[data-taxon-id='" + taxonID + "'] input" ).prop( "checked", true );
  }
}

// make all Windshaft overlay taxon entries are aware of their
// corresponding layers, and update the checkbox change binding
var updateCheckboxInteractions = function( ul ) {
  // if any of a taxon's layers is enabled, then check the taxon's checkbox
  window.lodash.each( ul.find( "li.taxon" ), function( taxon_li ) {
    updateTaxonCheckboxState( ul, $( taxon_li ).data("taxon-id") );
  });
  // reset the change interaction for taxon checkboxes
  ul.find("li.taxon input").unbind("change");
  // when a taxon checkbox is enabled, so are all of its layers and vice versa
  ul.find("li.taxon input").bind( "change", function( ) {
    var checked = $( this ).prop( "checked" );
    var selector = checked ? ":not(:checked)" : ":checked";
    ul.find( "li.for_taxon[data-taxon-id='" + $(this).attr("id") + "'] input" + selector ).
      prop( "checked", checked ).trigger( "change" );
  } );
};

var addWindshaftOverlayTaxonDiv = function( ul, li, options ) {
  // the ID of corresponding taxon LIs checkbox input
  taxon_id = "taxon_layers_" + options.taxon.id;
  // give a data-taxon-id to all the LIs that have a taxon
  // for example the LI for the taxon range layer will get data-taxon-id
  li.addClass( "for_taxon" );
  li.attr( "data-taxon-id", taxon_id );

  // if the taxon LI with checkbox doesn't exist, create it
  if( ul.find( "#" + taxon_id ).length == 0 ) {
    var taxonCheckbox = $("<input type='checkbox'/>")
      .attr("id", taxon_id)
      .attr("name", options.taxon.name);
    var primaryName;
    var taxonLabel;
    if ( options.taxon.forced_name ) {
      taxonLabel = $("<label/>").attr("for", taxon_id).html( options.taxon.forced_name );
    } else {
      primaryName = options.taxon.common_name ?
        options.taxon.common_name.name : options.taxon.to_styled_s;
      if ( !primaryName ) {
        primaryName = options.taxon.preferred_common_name;
      }
      if ( !primaryName ) {
        primaryName = options.taxon.name;
      }
      // prepare the label for the input, the taxon's scientific Name
      taxonLabel = $("<label/>").attr("for", taxon_id).html(primaryName);
    }
    // append the checkbox and label
    var legendLeft = $( "<div class='legend-left' />" );
    legendLeft.append( taxonCheckbox );
    var legendRight = $( "<div class='legend-right' />" );
    legendRight.append( taxonLabel );
    var taxonLi = $("<li/>").attr("class", "taxon").attr("data-taxon-id", taxon_id)
      .append( legendLeft, legendRight );
    if( options.taxon.url ) {
      // add a link icon that goes to the taxon page
       legendRight.append(" <a href='" + options.taxon.url + "'><i class='icon-link' /></a>");
    }
    // add the common name as a sub-heading if available
    if( primaryName !== options.taxon.to_styled_s) {
      legendRight.append($("<div/>").addClass( "small meta" )
        .html( options.taxon.to_styled_s ));
    }
    ul.append( taxonLi );
  }
};

iNaturalist.OverlayControl.prototype.addOverlay = function(lyr) {
  var map = this.map,
      ul = $('ul', this.div)
      name = lyr.name,
      id = lyr.id || name,
      overlay = lyr.overlay,
      checkbox = $('<input type="checkbox"></input>'),
      label = $('<label></label>').attr('for', id).html(name),
      li = $('<li></li>')
  checkbox
    .attr('id', id)
    .attr('name', name)
    .prop('checked', overlay.getMap())
  checkbox.click(function() {
    var name = $(this).attr('name'),
        overlay = map.getOverlay(name).overlay
    overlay.setMap(overlay.getMap() ? null : map)
  })
  li.append(checkbox, label)
  if (lyr.description) {
    li.append($('<div></div>').addClass('small meta').html(lyr.description))
  }
  ul.append(li)
}

google.maps.Map.prototype.addOverlay = function(name, overlay, options) {
  options = options || {}
  this.overlays = this.overlays || []
  var overlayOpts = {
    name: name,
    overlay: overlay,
    id: options.id,
    description: options.description
  }
  this.overlays.push(overlayOpts)
  if (overlay.setMap && !options.hidden) { overlay.setMap(this) }
  if (this._overlayControl) {this._overlayControl.addOverlay(overlayOpts)};
}
google.maps.Map.prototype.removeOverlay = function(name) {
  if (!this.overlays) { return }
  for (var i=0; i < this.overlays.length; i++) {
    if (this.overlays[i].name == name) { 
      this.overlays[i].overlay.setMap(null)
      this.overlays.splice(i)
    }
  }
}
google.maps.Map.prototype.getOverlay = function(name) {
  if (!this.overlays) { return }
  for (var i=0; i < this.overlays.length; i++) {
    if (this.overlays[i].name == name) { return this.overlays[i] }
  }
}

// given a URL and an options hash which should include an options.validParams
// array of strings, this will take all the options hash values for the keys
// in validParams and append them as HTTP GET attributes to the URL
var appendValidParamsToURL = function( url, options ) {
  var params = { };
  options.validParams = options.validParams || { };
  window.lodash.each( options, function( value, key ) {
    if( options.endpoint === "grid" ) { key = key.replace("grid_", ""); }
    if( options.endpoint === "points" ) { key = key.replace("point_", ""); }
    if( window.lodash.includes( options.validParams, key ) ) {
      params[ key ] = value;
    }
    if ( key.match( /field[:%]\w+/ ) ) {
      params[ key ] = value;
    }
  });
  // build the proper paramater string for HTTP GET
  if( params ) {
    return url += "?" + $.param( params );
  }
  return url;
};

google.maps.Map.prototype.addPlaceLayer = function( options ) {
  window.lodash.defaults( options, { validParams: [ "color", "tile_size" ] });
  return this.addPostgisLayerByEndpoint( "places", options.place.id, options );
};

google.maps.Map.prototype.addTaxonRangeLayer = function( options ) {
  window.lodash.defaults( options, { validParams: [ "color", "tile_size" ] });
  return this.addPostgisLayerByEndpoint( "taxon_ranges", options.taxon.id, options );
};

google.maps.Map.prototype.addTaxonPlacesLayer = function( options ) {
  window.lodash.defaults( options, { validParams: [ "confirmed_color", "unconfirmed_color", "tile_size" ] });
  return this.addPostgisLayerByEndpoint( "taxon_places", options.taxon.id, options );
};

var cachedGBIFColors;
var GBIFMapColors = function( ) {
  if( cachedGBIFColors ) { return cachedGBIFColors; }
  var colors = [ { range: ",10", color: "#F7005A" },
                 { range: "10,100", color: "#D50067" },
                 { range: "100,1000", color: "#B5006C" },
                 { range: "1000,10000", color: "#94006A" },
                 { range: "10000,100000", color: "#72005F" },
                 { range: "100000,", color: "#52034E" } ];
  var opacity = 0.9;
  // turn the decimal 0 - 1 opacity into 0 - 255 alpha hex value
  var alphaOpacity = parseFloat(Math.ceil(opacity * 255)).toString(16);
  cachedGBIFColors = window.lodash.map( colors, function( c ) {
    // e.g. 10,100,#000000FF
    return encodeURIComponent( c.range + "," + c.color + alphaOpacity );
  }).join("%7C");
  return cachedGBIFColors;
};

google.maps.Map.prototype.addGBIFLayer = function( options ) {
  var layerTileURL = "https://api.gbif.org/v1/map/density/tile?x={x}&y={y}&z={z}&type=TAXON&key=" +
    options.gbif_id + "&resolution=4&colors=" + GBIFMapColors();
  return this.addLayerAndControl( { tiles: [ layerTileURL ] }, window.lodash.extend( options, { endpoint: "gbif" } ));
};

google.maps.Map.prototype.addPostgisLayerByEndpoint = function( endpoint, endpointID, options ) {
  // prevent the tilt feature, which cannot overlay tiles at higher zooms
  this.setTilt(0);
  var tileservers = postgisTileservers( );
  var options = options || { };
  options.tile_size = 512;
  var tileURLs = window.lodash.map( tileservers , function( base ) {
    return appendValidParamsToURL(
      base + "/" + endpoint + "/" + endpointID + "/{z}/{x}/{y}.png", options );
  });
  return this.addLayerAndControl( { tiles: tileURLs, tileSize: 512 }, options );
};

// Convenience method that likely isn't called outside this file.
// Will add a layer and send that layer's data to addWindshaftOverlayControl
// to add a checkbox toggle for this new layer
google.maps.Map.prototype.addLayerAndControl = function( tilejson, options ) {
  options = options || { }
  tilejson.interactive = false;
  var layer = new wax.g.connector( tilejson );
  layer.title = options.title;
  var layerID = this.overlayMapTypes.push( layer );
  if( options.disabled ) {
    // even though the layer is meant to be disabled (unselected) by default
    // we need to secure the layerID so that we can add the layer in the proper
    // places when the user selects it. That is why the layer is added
    // above and immediately set to null here.
    this.overlayMapTypes.setAt( layerID - 1, emptyLayer );
  }
  if( this._overlayControl ) {
    this._overlayControl.addWindshaftOverlayControl(
      [ { layer: layer, layerID: layerID } ], options );
  }
  return layerID;
};

function elasticsearchTileservers( ) {
  var tileservers = [ "https://tiles.inaturalist.org/v1" ];
  if( tileservers[0].match(/{n}/) ) {
    var pattern = tileservers[0];
    tileservers = window.lodash.map([ "1", "2", "3", "4" ], function( n ) {
      return pattern.replace( "{n}", n );
    });
  }
  return tileservers;
}

function intereactionsServer( ) {
  var interactionTileURL = "https://tiles.inaturalist.org/v1";
  if( interactionTileURL ) { return interactionTileURL; }
  return elasticsearchTileservers( )[0];
}

// node_api_url and tile_servers.elasticsearch refer to two
// different clusters running the same code. node_api_url will
// be faster for DB/postgis queries
function postgisTileservers( ) {
  var nodeApiURL = "https://api.inaturalist.org/v1";
  if( nodeApiURL ) { return [ nodeApiURL ]; }
  return elasticsearchTileservers( );
}

google.maps.Map.prototype.removeAllLayers = function( ) {
  for (var i = this.overlayMapTypes.length - 1; i >= 0; i--) {
    var mapType = this.overlayMapTypes.getAt(i),
        title = mapType.title;
    if ( mapType.interactivity ) {
      mapType.interactivity.remove();
    }
    this.overlayMapTypes.removeAt(i);
    if( this._overlayControl ) {
      this._overlayControl.removeOverlayControl(title)
    }
  }
  if ( this._overlayControl ) {
    this._overlayControl.removeAll( );
  }
}

google.maps.Map.prototype.removeObservationsLayer = function(title) {
  for (var i = this.overlayMapTypes.length - 1; i >= 0; i--) {
    if( this.overlayMapTypes.getAt(i).title == title ) {
      this.overlayMapTypes.getAt(i).interactivity.remove();
      this.overlayMapTypes.removeAt(i);
      if( this._overlayControl ) {
        this._overlayControl.removeOverlayControl(title)
      } 
    }
  }
}

google.maps.Map.prototype.addObservationsLayer = function(title, options) {
  // prevent the tilt feature, which cannot overlay tiles at higher zooms
  this.setTilt( 0 );
  var tileservers = elasticsearchTileservers( );
  options.style = "geotilegrid";
  var options = options || { },
      gridTileSuffix = "/" + (options.mapStyle || "grid" ) +
        "/{z}/{x}/{y}.png",
      pointTileSuffix = "/points/{z}/{x}/{y}.png",
      gridmaxzoom = options.gridmaxzoom || 9;
  options.title = title;
  options.tile_size = 512;
  // If iconic colors requested, use the default API behavior, which is to show
  // iconic colors at close zooms
  if ( options.color === "iconic" ) {
    delete options.color;
  } else if ( options.mapStyle !== "heatmap" ) {
    options.color = options.color || "#FF4500"; // default the points to the same color as the grid
  }
  if( options.taxon ) { options.taxon_id = options.taxon.id; }
  // using a less generic name for the elasticmaps param to not show
  // an observation on a tile, because we have a Google marker for it
  if( options.observation_id && typeof options.observation_id == "number" ) {
    options.featured_observation_id = options.observation_id;
  }
  // these are the parameters that will be sent to the node API
  var paramKeys = [
    "acc",
    "acc_above",
    "acc_below",
    "apply_project_rules_for",
    "border_opacity",
    "cache",
    "captive",
    "collection_preview",
    "color",
    "created_d1",
    "created_d2",
    "created_on",
    "d1",
    "d2",
    "day",
    "endemic",
    "featured_observation_id",
    "geo",
    "geoprivacy",
    "has",
    "has",
    "hrank",
    "id_above",
    "iconic_taxa",
    "iconic_taxa",
    "ident_taxon_id",
    "ident_taxon_id_exclusive",
    "ident_user_id",
    "identifications",
    "identified",
    "introduced",
    "lat",
    "line_color",
    "line_opacity",
    "line_width",
    "list_id",
    "lng",
    "lrank",
    "members_of_project",
    "month",
    "native",
    "nelat",
    "nelng",
    "not_in_place",
    "not_in_project",
    "not_matching_project_rules_for",
    "not_user_id",
    "oauth_application_id",
    "on",
    "opacity",
    "photo_license",
    "photos",
    "place_id",
    "popular",
    "precision",
    "precision_offset",
    "project_id",
    "project_ids",
    "projects[]",
    "q",
    "quality_grade",
    "radius",
    "rank",
    "reviewed",
    "scaled",
    "search_on",
    "skip_top_hits",
    "sounds",
    "style",
    "swlat",
    "swlng",
    "taxon_geoprivacy",
    "taxon_id",
    "taxon_ids",
    "taxon_ids[]",
    "term_id",
    "term_value_id",
    "threatened",
    "tile_size",
    "ttl",
    "unobserved_by_user_id",
    "user_after",
    "user_before",
    "user_id",
    "verifiable",
    "viewer_id",
    "viewer_id",
    "width",
    "without_taxon_id",
    "without_term_value_id",
    "year"
  ];
  gridTileSuffix = appendValidParamsToURL( gridTileSuffix, window.lodash.extend(
    options, { validParams: paramKeys, endpoint: "grid" } ));
  pointTileSuffix = appendValidParamsToURL( pointTileSuffix, window.lodash.extend(
    options, { validParams: paramKeys, endpoint: "points" } ));
  // add a layer to the map for the grid
  gridLayer = this.addTileLayer( window.lodash.map( tileservers , function( base ) {
      return base + gridTileSuffix;
    }), {
    maxzoom: gridmaxzoom,
    gridmaxzoom: gridmaxzoom,
    interactivity: options.interactivity === false ? false : 'id',
    interactionsURL: intereactionsServer( ) + gridTileSuffix,
    disabled: options.disabled,
    infoWindowCallback: options.infoWindowCallback,
    tileSize: ( Number( options.tile_size ) === 512 ) ? 512 : 256
  });
  pointLayer = this.addTileLayer( window.lodash.map( tileservers , function( base ) {
      return base + pointTileSuffix;
    }), {
    interactivity: options.interactivity === false ? false : 'id',
    minzoom: gridmaxzoom + 1,
    gridminzoom: gridmaxzoom + 1,
    interactionsURL: intereactionsServer( ) + pointTileSuffix,
    disabled: options.disabled,
    infoWindowCallback: options.infoWindowCallback,
    tileSize: ( Number( options.tile_size ) === 512 ) ? 512 : 256
  });
  gridLayer.layer.title = title;
  pointLayer.layer.title = title;
  // add a toggle for this layer to the overlay control, if it exists
  if( this._overlayControl ) {
    this._overlayControl.addWindshaftOverlayControl(
      [ gridLayer, pointLayer ], options
    );
  }
};

google.maps.Map.prototype.getInfoWindow = function( options ) {
  iw = new google.maps.InfoWindow( window.lodash.extend( { }, options, {
    position: new google.maps.LatLng( 0, 0 )
  }));
  return iw;
};

google.maps.Map.prototype.createInfoWindow = function( options ) {
  if( !this.infoWindow ) {
    this.infoWindow = this.getInfoWindow( options );
  }
  return this.infoWindow;
};


google.maps.Map.prototype.addTileLayer = function(tileURLs, options) {
  var options = options || {},
      interactivity = options.interactivity;
  if( options.interactivity ) {
    // windshaft needs the interactivity param to know what data to render
    var interactionsURLs = options.interactionsURL ?
      [ options.interactionsURL ] : tileURLs;
    options.grids = window.lodash.map( interactionsURLs, function( l ) {
      return google.maps.Map.prototype.utfgridURL( l );
    })
  }
  // finish preparing the tile options hash
  var waxOptions = $.extend(true, { }, {
    tiles: tileURLs,
    // wax needs template or it won't fire on events
    "template": "{{species_guess}}"
  }, options);
  var layer = new wax.g.connector( waxOptions );
  var layerID =  this.overlayMapTypes.push( layer );
  if( options.disabled ) {
    this.overlayMapTypes.setAt( layerID - 1, emptyLayer);
  }
  // // add a utfgrid data layer and custom JS events to catch interactivity
  // if( options.interactivity ) {
    // layer.interactivity = this.addTileInteractivity( waxOptions, layerID, options );
  // }
  // return the layer and index of this layer in the current stack
  return { layer: layer, layerID: layerID };
}

google.maps.Map.prototype.utfgridURL = function( tileURL ) {
  url = tileURL.replace( /\.png/, ".grid.json" );
  url += ( url.indexOf("?") < 0 ) ? "?" : "&";
  return url;
};

// google.maps.Map.prototype.addTileInteractivity = function( tilejson, layerID, options ) {
  // var map = this;
  // var interactionOn = false;
  // var waxInteraction = wax.g.interaction( { tileSize: tilejson.tileSize || 256 });
  // var oldFeature = waxInteraction.screen_feature;
  // map.createInfoWindow( );

  // waxInteraction.screen_feature = function( pos, callback ) {
    // // making sure the colored heatmap doesn't have offset interactions
    // if( options.maxzoom && map.getZoom( ) <= options.maxzoom ) {
      // return oldFeature( pos, callback );
    // }
    // oldFeature( { x: pos.x, y: pos.y + 13 }, function( f ) {
      // if( f && f.geoprivacy != "obscured" && !f.private_location ) {
        // return callback( f );
      // }
      // oldFeature( pos, function( f ) {
        // if( f && f.geoprivacy != "obscured" && !f.private_location ) {
          // return callback( );
        // }
        // callback( f );
      // });
    // });
  // };

  // waxInteraction.is_disabled = function( ) {
    // return map.overlayMapTypes.getAt( layerID - 1 ) === emptyLayer;
  // };

  // waxInteraction
    // .map(map)
    // .tilejson(tilejson)
    // .on({
      // on: function(o) {
        // // check to see if the layer with the interaction is enabled
        // if( waxInteraction.is_disabled( ) ) {
          // return null;
        // }
        // interactionOn = true;
        // map.setOptions({ draggableCursor: 'pointer' });
        // if (o.e.type == 'click') {
          // // if a native infoWindow was just opened, don't let another one open
          // if( infoWindowOpenTime && new Date( ) - infoWindowOpenTime < 500 ) {
            // return false;
          // }
          // // this is ugly but works, until Google maps changes and breaks it.
          // // The main map div contains a div with z-index:0 that sets the cursor.
          // // The third element in that div (with z-index: 3) is the lowest level
          // // element that will capture any mouse events from the user.
          // // The main goal here is to only respond to clicks on the map and only
          // // on the map, and nothing that might be shown over the map, like
          // // another infowindow or other Google Maps, or custom map, UI.
          // // needs to be asynchronous so the selector resolves
          // var googleMainMapDiv = $(map.div).find("div[style*='cursor'][style*='z-index: 0']");
          // var googleMapInteractionsDiv = $(googleMainMapDiv).children()[2];
          // if( !$.contains( googleMapInteractionsDiv, o.e.target ) &&
            // !$( googleMapInteractionsDiv ).is( o.e.target ) ) { return false; }
          // // if a native infoWindow is still open, close it
          // if( iNaturalist.Map.infoWindow ) { iNaturalist.Map.infoWindow.close( ); }
          // // hide the legend if it is open so the infoWindow has room
          // $( "#map-legend" ).hide( );
          // if( o.data['latitude'] ) {
            // var latLng = new google.maps.LatLng(o.data['latitude'],o.data['longitude']);
            // var iw = map.createInfoWindow( );
            // var iwOpts = { };
            // if( options.minzoom && o.data.geoprivacy != "obscured" && !o.data.private_location ) {
              // // if we're showing points and the marker isn't obscured then leave
              // // a small margin under the infowidow so it show above the marker
              // iwOpts.pixelOffset = new google.maps.Size(0, -11);
            // } else {
              // iwOpts.pixelOffset = new google.maps.Size(0, 0);
            // }
            // if( options.infoWindowCallback ) {
              // return options.infoWindowCallback( map, iw, latLng, o.data['id'], iwOpts );
            // }
            // $.ajax({
              // url:  'https://www.inaturalist.org/observations/' + o.data['id'] + '.html?partial=cached_component',
              // type: 'GET',
              // dataType: 'html',
              // beforeSend: function() {
                // var content = $( '<div class="loading status">' + "Lädt..." + "</div>" ).get( 0 );
                // map.infoWindowSetContent( iw, latLng, content, iwOpts );
              // },
              // success: function(data) {
                // var content = $('<div class="compact mini infowindow observations"></div>' ).
                  // append( data ).get( 0 );
                // map.infoWindowSetContent( iw, latLng, content, iwOpts );
              // },
              // error: function(jqXHR, textStatus, errorThrown) {
                // console.log(textStatus);
              // }
            // });
          // }
        // }
      // },
      // off: function(o) {
        // // check to see if the layer with the interaction is enabled
        // if( map.overlayMapTypes.getAt( layerID - 1 ) === emptyLayer ) {
          // return null;
        // }
        // // no need to keep setting the option while the mouse
        // // is outside any interactive point
        // if( interactionOn ) {
          // map.setOptions({ draggableCursor: 'url(https://maps.google.com/mapfiles/openhand.cur), move' });
        // }
        // interactionOn = false;
      // }
    // });
  // return waxInteraction;
// };

google.maps.Map.prototype.infoWindowSetContent = function( iw, latLng, content, options ) {
  options = options || { };
  iw.close( );
  if( options.pixelOffset ) {
    // proper window placement for non-obscured markers
    iw.setOptions({ pixelOffset: options.pixelOffset });
  }
  iw.position = latLng;
  iw.setContent( content );
  iw.open( this );
  // make sure the InfoWindow has focus
  $( iw ).focus( );
  // remove any text highlighting, which happens when the user clicks around
  deselectText( );
  // setting infoWindowOpenTime to prevent rapid window toggling
  infoWindowOpenTime = new Date( );
};

// Static constants
iNaturalist.Map.ICONS = {
  DodgerBlue34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_DodgerBlue.png"),
  DeepPink34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_DeepPink.png"),
  iNatGreen34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_iNatGreen.png"),
  OrangeRed34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_OrangeRed.png"),
  DarkMagenta34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_DarkMagenta.png"),
  unknown34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_unknown.png"),
  ChromistaBrown34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_ChromistaBrown.png")
};

iNaturalist.Map.STEMLESS_ICONS = {
  DodgerBlue34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_stemless_DodgerBlue.png"),
  DeepPink34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_stemless_DeepPink.png"),
  iNatGreen34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_stemless_iNatGreen.png"),
  OrangeRed34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_stemless_OrangeRed.png"),
  DarkMagenta34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_stemless_DarkMagenta.png"),
  unknown34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_stemless_unknown.png"),
  ChromistaBrown34: new google.maps.MarkerImage("https://www.inaturalist.org/mapMarkers/mm_34_stemless_ChromistaBrown.png")
};

iNaturalist.Map.ICONIC_TAXON_ICONS = {
  Protozoa: iNaturalist.Map.ICONS.DarkMagenta34,
  Animalia: iNaturalist.Map.ICONS.DodgerBlue34,
  Plantae: iNaturalist.Map.ICONS.iNatGreen34,
  Fungi: iNaturalist.Map.ICONS.DeepPink34,
  Amphibia: iNaturalist.Map.ICONS.DodgerBlue34,
  Reptilia: iNaturalist.Map.ICONS.DodgerBlue34,
  Aves: iNaturalist.Map.ICONS.DodgerBlue34,
  Mammalia: iNaturalist.Map.ICONS.DodgerBlue34,
  Actinopterygii: iNaturalist.Map.ICONS.DodgerBlue34,
  Mollusca: iNaturalist.Map.ICONS.OrangeRed34,
  Insecta: iNaturalist.Map.ICONS.OrangeRed34,
  Arachnida: iNaturalist.Map.ICONS.OrangeRed34,
  Chromista: iNaturalist.Map.ICONS.ChromistaBrown34
};

iNaturalist.Map.STEMLESS_ICONIC_TAXON_ICONS = {
  Protozoa: iNaturalist.Map.STEMLESS_ICONS.DarkMagenta34,
  Animalia: iNaturalist.Map.STEMLESS_ICONS.DodgerBlue34,
  Plantae: iNaturalist.Map.STEMLESS_ICONS.iNatGreen34,
  Fungi: iNaturalist.Map.STEMLESS_ICONS.DeepPink34,
  Amphibia: iNaturalist.Map.STEMLESS_ICONS.DodgerBlue34,
  Reptilia: iNaturalist.Map.STEMLESS_ICONS.DodgerBlue34,
  Aves: iNaturalist.Map.STEMLESS_ICONS.DodgerBlue34,
  Mammalia: iNaturalist.Map.STEMLESS_ICONS.DodgerBlue34,
  Actinopterygii: iNaturalist.Map.STEMLESS_ICONS.DodgerBlue34,
  Mollusca: iNaturalist.Map.STEMLESS_ICONS.OrangeRed34,
  Insecta: iNaturalist.Map.STEMLESS_ICONS.OrangeRed34,
  Arachnida: iNaturalist.Map.STEMLESS_ICONS.OrangeRed34,
  Chromista: iNaturalist.Map.STEMLESS_ICONS.ChromistaBrown34
};

iNaturalist.Map.ICONIC_TAXON_COLORS = {
  Protozoa: '#8B008B', // 'DarkMagenta',
  Animalia: '#1E90FF', //'DodgerBlue',
  Plantae: '#73AC13',
  Fungi: '#FF1493', // 'DeepPink',
  Amphibia: '#1E90FF',
  Reptilia: '#1E90FF',
  Aves: '#1E90FF',
  Mammalia: '#1E90FF',
  Actinopterygii: '#1E90FF',
  Mollusca: '#FF4500', //'OrangeRed',
  Insecta: '#FF4500',
  Arachnida: '#FF4500',
  Chromista: '#993300'
}


})(jQuery);

function markerObscuredRectangle( marker, shapeOptions ) {
  var cell_size = 0.2;
  var position = marker.getPosition( );
  var coords = [ position.lat(), position.lng() ];
  var ll = [ coords[0] - ( coords[0] % cell_size ),
             coords[1] - ( coords[1] % cell_size ) ];
  var uu = [ ll[0], ll[1] ];
  window.lodash.each( coords, function( value, key ) {
    if( value < uu[key] ) { uu[key] -= cell_size; }
    else { uu[key] += cell_size; }
  });
  return new google.maps.Rectangle( window.lodash.extend( shapeOptions, {
    bounds: new google.maps.LatLngBounds(
        new google.maps.LatLng( Math.min(uu[0], ll[0]), Math.min(uu[1], ll[1]) ),
        new google.maps.LatLng( Math.max(uu[0], ll[0]), Math.max(uu[1], ll[1]) ))
  }));
}
