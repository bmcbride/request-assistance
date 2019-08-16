var app = {
  config: {
    url: "https://script.google.com/macros/s/AKfycbx6e3wLbrFUMnM4VQH7Jqwu30aNSeQLzZKcKm0bW3qNa6Uk1y0N/exec"
  }
};

app.bounds = new google.maps.LatLngBounds()

app.infoWindow = new google.maps.InfoWindow({
  disableAutoPan: true
});

app.autocomplete = new google.maps.places.Autocomplete((document.getElementById("search")), {
  types: ["geocode"]
});

app.autocomplete.addListener("place_changed", function() {
  var place = this.getPlace();
  if (place) {
    placeChanged(place);
  }
});

function placeChanged (place) {
  if (place && place.geometry) {
    app.map.setCenter(place.geometry.location);
    app.map.setZoom(18);
    if (place.geometry.viewport) {
      app.map.fitBounds(place.geometry.viewport);
    }
    app.infoWindow.setPosition(place.geometry.location);
    app.infoWindow.setContent(place.formatted_address);
    app.infoWindow.open(app.map);
  }
  $(".navbar-collapse").collapse("hide");
};

$(".navbar-collapse").on("hidden.bs.collapse", function () {
  $("body").css("padding-top", $(".navbar").css("height"));
  google.maps.event.trigger(app.map, "resize");
});

app.map = new google.maps.Map($("#map")[0], {
  styles: [{
    featureType: "poi",
    stylers: [{visibility: "off"}]
  }, {
    featureType: "transit",
    elementType: "labels.icon",
    stylers: [{visibility: "off"}]
  }],
  fullscreenControl: false,
  streetViewControl: false,
  zoomControl: false,
  mapTypeControl: true,
  mapTypeControlOptions: {
    // style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
    mapTypeIds: [
      google.maps.MapTypeId.ROADMAP,
      google.maps.MapTypeId.SATELLITE
    ]
  },
  gestureHandling: "greedy",
  controlSize: 28,
  zoom: 0,
  center: {
    lat: 0,
    lng: 0
  }
});

app.autocomplete.bindTo("bounds", app.map);

app.locationMarker =new google.maps.Marker({
  map: app.map,
  clickable: false,
  visible: false,
  icon: {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 6,
    fillColor: "#3a84df",
    fillOpacity: 0.9,
    strokeColor: "#fff",
    strokeWeight: 2
  }
});

app.locationCircle = new google.maps.Circle({
  map: app.map,
  clickable: false,
  visible: false,
  radius: 1,
  strokeColor: "#3a84df",
  strokeOpacity: 0.8,
  strokeWeight: 0.5,
  fillColor: "#3a84df",
  fillOpacity: 0.10
});

app.geolocationBtn = document.createElement("div");
app.geolocationBtn.id = "geolocationBtn";
app.geolocationBtn.style.cssText = "background-color:#fff;border:2px solid #fff;border-radius 3px;box-shadow:rgba(0,0,0,0.298039) 0 1px 4px -1px;margin:7px;cursor:pointer;border-radius:2px;padding:3px;";
app.geolocationBtn.index = 1;
app.geolocationIcon = document.createElement("div");
app.geolocationIcon.id = "geolocationIcon";
app.geolocationIcon.style.cssText = "background-size:36px 18px;width:18px;height:18px;opacity:0.9;background-image:url(assets/img/geolocation.png);";
app.geolocationBtn.appendChild(app.geolocationIcon);

app.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(app.geolocationBtn);

google.maps.event.addDomListener(app.map, "center_changed", function() {
  $("input[name=latitude]").val(app.map.getCenter().lat().toFixed(6));
  $("input[name=longitude]").val(app.map.getCenter().lng().toFixed(6));
});

google.maps.event.addDomListener(app.geolocationBtn, "click", function() {
  app.map.fitBounds(app.locationCircle.getBounds());
});

function reverseGeocode(latlng) {
  var geocoder = new google.maps.Geocoder();
  geocoder.geocode({"location": latlng}, function(results, status) {
    if (status === "OK") {
      if (results[0]) {
        var address_components = results[0].address_components;
        var components = {};
        $.each(address_components, function(k,v1) {
          $.each(v1.types, function(k2, v2) {
            components[v2] = v1.short_name;
          });
        });

        if (results[0].formatted_address) {
          $("input[name=address]").val(results[0].formatted_address);
        } else {
          $("input[name=address]").val("");
        }
        if (components.locality) {
          $("input[name=city]").val(components.locality);
        } else {
          $("input[name=city]").val("");
        }
        if (components.administrative_area_level_1) {
          $("input[name=state]").val(components.administrative_area_level_1);
        } else {
          $("input[name=state]").val("");
        }
        if (components.postal_code) {
          $("input[name=zip]").val(components.postal_code);
        } else {
          $("input[name=zip]").val("");
        }
        if (components.administrative_area_level_2) {
          $("input[name=county]").val(components.administrative_area_level_2);
        } else {
          $("input[name=county]").val("");
        }
      }
    } else {
      $("input[name=address]").val("");
      $("input[name=city]").val("");
      $("input[name=state]").val("");
      $("input[name=zip]").val("");
      $("input[name=county]").val("");
    }
  });
}

function geolocationError(error) {
  alert("Error: " + error.message);
  app.locationMarker.setVisible(false);
  app.locationCircle.setVisible(false);
}

function locationUpdate(position){
  var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
  app.locationMarker.setVisible(true);
  app.locationMarker.setPosition(latLng);
  app.locationCircle.setVisible(true);
  app.locationCircle.setCenter(latLng);
  app.locationCircle.setRadius(position.coords.accuracy);
}

function serializeForm() {
  var o = {};
  var a = $("#form").serializeArray();
  $.each(a, function () {
    if (o[this.name]) {
      if (!o[this.name].push) {
        o[this.name] = [o[this.name]];
      }
      o[this.name].push(this.value || "");
      o[this.name] = o[this.name].join();
    } else {
      o[this.name] = this.value || "";
    }
  });
  return $.param(o);
}

$("#form").submit(function(e) {
  $("#uploading-modal").modal("show");
  $.ajax({
    type: "POST",
    url: app.config.url,
    data: serializeForm(),
    success: function() {
      $("#uploading-modal").modal("hide");
      $("#success-modal").modal("show");
      $("#form")[0].reset();
      $("#photo-preview").attr("src", "");
      $("#photo-preview").hide();
    }
  });
  e.preventDefault();
});

$("#file").change(function(e) {
  if (e.target.files && e.target.files[0]) {
    // var reader = new FileReader();
    // reader.onload = function (e) {
    //   $("input[name=photo]").val(e.target.result.replace(/^(.+,)/, ""));
    //   $("#photo-preview").attr("src", e.target.result);
    //   $("#photo-preview").show();
    // };
    // reader.readAsDataURL(e.target.files[0]);
    loadImage(
      e.target.files[0],
      function (img) {
        img.toBlob(function(resizedImageBlob) {
          loadImage.parseMetaData(
            e.target.files[0],
            function(data) {
              if (!data.imageHead) {
                return;
              }
              // Combine data.imageHead with the image body of a resized file to create scaled images with the original image meta data, e.g.:
              var blob = new Blob(
                [
                  data.imageHead,
                  // Resized images always have a head size of 20 bytes, including the JPEG marker and a minimal JFIF header:
                  loadImage.blobSlice.call(resizedImageBlob, 20)
                ],
                {type: resizedImageBlob.type}
              );
              var reader = new FileReader();
              reader.onload = function (e) {
                $("input[name=photo]").val(e.target.result.replace(/^(.+,)/, ""));
                $("#photo-preview").attr("src", e.target.result);
                $("#photo-preview").show();
              };
              reader.readAsDataURL(blob);
            },
            {
              maxMetaDataSize: 262144,
              disableImageHead: false
            }
          );
        }, "image/jpeg");
      }, {
        maxWidth: 1024,
        maxHeight: 1024,
        meta: true,
        canvas: true
      }
    );
  }  else {
    removePhoto();
  }
});

function removePhoto() {
  $("#photo-preview").attr("src", "");
  $("#photo-preview").hide();
  $("#file").val("");
  $("input[name=photo]").val("");
}

$("#attach-photo-btn").click(function() {
  $("#file").trigger("click");
  return false;
});

$("#remove-photo-btn").click(function() {
  removePhoto();
  return false;
});

$("#location-btn").click(function() {
  reverseGeocode(app.map.getCenter());
  return false;
});

$(window).resize(function () {
  $("body").css("padding-top", $(".navbar").css("height"));
});

$(document).ready(function() {
  // UIkit.modal($("#welcome-modal")).show();
  $("body").css("padding-top", $(".navbar").css("height"));

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position){
      reverseGeocode(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
      locationUpdate(position);
      app.map.fitBounds(app.locationCircle.getBounds());
      navigator.geolocation.watchPosition(locationUpdate, geolocationError, {enableHighAccuracy: true});
    }, geolocationError, {enableHighAccuracy: true});
  } else {
    alert("Error: Your browser doesn't support geolocation.");
  }
});
