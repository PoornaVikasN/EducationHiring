import { Box, IconButton, TextField, Typography } from "@mui/material";
import GalleryIcon from "assets/images/png/map-icon.png";
import MapModal from "components/GoogleMapsModal";
import Image from "components/Image";
import React, { useEffect, useState } from "react";
import PlacesAutocomplete, {
geocodeByAddress,
getLatLng,
} from "react-places-autocomplete";

const Input = ({ setValue, getValues, disabled, data }: any) => {
const [address, setAddress] = useState("");
const [state, setState] = useState(false);
const [isMapOpen, setIsMapOpen] = useState(false);

const removePlusCode = (address: string) => {
const plusCodePattern = /^[\w\d\+]+\s*,\s*/;
return address.replace(plusCodePattern, "");
};

const handleSelect = async (value: any) => {
const results = await geocodeByAddress(value);
const latLng = await getLatLng(results[0]);
setAddress(value);

    setValue("address", value);
    setValue("longitude", latLng.lng);
    setValue("latitude", latLng.lat);

};

const handleMapSelect = (latLng: any) => {
setValue("longitude", latLng.lng);
setValue("latitude", latLng.lat);
geocodeByAddress(`${latLng.lat},${latLng.lng}`).then((results) => {
const cleanedAddress = removePlusCode(results[0].formatted_address);
setAddress(cleanedAddress);
setValue("address", cleanedAddress);
});
};

useEffect(() => {
setState(true);
}, []);

useEffect(() => {
if (getValues("address")) {
setAddress(getValues("address"));
}
}, [state]);

return (
<div style={{ marginTop: "8px" }}>
<PlacesAutocomplete
debounce={2000}
value={address}
onChange={(newValue: React.SetStateAction<string>) =>
setAddress(newValue)
}
onSelect={handleSelect}
searchOptions={{
          // sessionToken: session,
          componentRestrictions: { country: "IN" },
        }} >
{({ getInputProps, suggestions, getSuggestionItemProps }) => (
<div>
<TextField
fullWidth
required
size="small"
variant="standard"
label="Full Address"
InputProps={{
                endAdornment: (
                  <IconButton onClick={() => setIsMapOpen(true)}>
                    <Image
                      src={GalleryIcon}
                      alt={"Image"}
                      height={"24px"}
                      width={"24px"}
                    />
                  </IconButton>
                ),
              }}
{...getInputProps({
className: "location-search-input",
disabled: disabled,
})}
/>
{suggestions.length > 0 && (
<Box
sx={{
                  position: "absolute",
                  zIndex: 20,
                  backgroundColor: "white",
                  boxShadow:
                    "0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 1px 10px 0 rgba(0, 0, 0, 0.19)",
                  padding: 1,
                }} >
{suggestions.map((suggestion) => {
return (
<Box sx={{ p: 1 }} {...getSuggestionItemProps(suggestion)}>
<Typography sx={{ cursor: "pointer" }}>
{suggestion.description}
</Typography>
</Box>
);
})}
</Box>
)}
</div>
)}
</PlacesAutocomplete>
<MapModal
open={isMapOpen}
onClose={() => setIsMapOpen(false)}
onSelectLocation={handleMapSelect}
data={data}
/>
</div>
);
};

export default Input;
