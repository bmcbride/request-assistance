var app = {
  config: {
    url: "https://script.google.com/macros/s/AKfycbx6e3wLbrFUMnM4VQH7Jqwu30aNSeQLzZKcKm0bW3qNa6Uk1y0N/exec"
  }
};

app.map = new google.maps.Map($("#map")[0], {
  fullscreenControl: false,
  streetViewControl: false,
  gestureHandling: "greedy",
  zoom: 0,
  center: {
    lat: 0,
    lng: 0
  }
});

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
app.geolocationBtn.style.cssText = "background-color:#fff;border:2px solid #fff;border-radius 3px;box-shadow:rgba(0,0,0,0.298039) 0 1px 4px -1px;margin-right:10px;cursor:pointer;border-radius:2px;padding:3px;";
app.geolocationBtn.index = 1;
app.geolocationIcon = document.createElement("div");
app.geolocationIcon.id = "geolocationIcon";
app.geolocationIcon.style.cssText = "background-size:36px 18px;width:18px;height:18px;opacity:0.9;background-image:url(assets/img/geolocation.png);";
app.geolocationBtn.appendChild(app.geolocationIcon);

app.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(app.geolocationBtn);

google.maps.event.addDomListener(app.map, "center_changed", function() {
  $("input[name=latitude]").val(app.map.getCenter().lat().toFixed(6));
  $("input[name=longitude]").val(app.map.getCenter().lng().toFixed(6));
});

google.maps.event.addDomListener(app.geolocationBtn, "click", function() {
  app.map.fitBounds(app.locationCircle.getBounds());
});

function reverseGeocode(latlng) {
  var geocoder = new google.maps.Geocoder;
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
  $("input[name=latitude]").val(position.coords.latitude.toFixed(6));
  $("input[name=longitude]").val(position.coords.longitude.toFixed(6));
}

function serializeForm() {
  var ser = $("#form [name]").not("select").serialize();
  $("select", $("#form")).each(function(i, select) {
    var s = "";
    $("option:selected", select).each(function() {
        s += (s.length>0?", ":"") + $(this).val();
    });
    ser += (ser.length>0?"&":"") + $(select).attr("name") + "=" + s;
  });
  return ser;
}

$("#form").submit(function(e) {
  UIkit.modal($("#loading-modal")).show();
  $.ajax({
    type: "POST",
    url: app.config.url,
    data: serializeForm(),
    success: function() {
      UIkit.notification.closeAll();
      UIkit.modal($("#success-modal")).show();
      $("#form")[0].reset();
      $("#photo-preview").attr("src", "");
      $("#photo-preview").hide();
    }
  });
  e.preventDefault();
});

$("#file").change(function(e) {
  if (e.target.files.length > 0) {
    loadImage(
      e.target.files[0],
      function (img) {
        $("input[name=photo]").val(img.toDataURL("image/jpeg").replace(/^(.+,)/, ""));
        $("#photo-preview").attr("src", img.toDataURL("image/jpeg"));
        $("#photo-preview").show();
      }, {
        maxWidth: 1024,
        maxHeight: 1024,
        canvas: true
      }
    );
  } else {
    $("#photo-preview").attr("src", "");
    $("#photo-preview").hide();
  }
});

$("#location-btn").click(function() {
  reverseGeocode(app.map.getCenter());
  return false;
});

$(document).ready(function() {
  UIkit.modal($("#welcome-modal")).show();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position){
      locationUpdate(position);
      app.map.fitBounds(app.locationCircle.getBounds());
      reverseGeocode(app.map.getCenter());
      navigator.geolocation.watchPosition(locationUpdate, geolocationError, {enableHighAccuracy: true});
    }, geolocationError, {enableHighAccuracy: true});
  } else {
    alert("Error: Your browser doesn't support geolocation.");
  }
});
