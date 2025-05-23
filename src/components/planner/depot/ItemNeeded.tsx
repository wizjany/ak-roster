import AddCircleIcon from "@mui/icons-material/AddCircle";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleIcon from "@mui/icons-material/RemoveCircle";
import { Box, Button, ButtonBase, ButtonGroup, IconButton, InputAdornment, TextField, Tooltip } from "@mui/material";
import React, { ElementType, useEffect, useState, useRef } from "react";

import items from "data/items.json";

import CraftingIcon from "./CraftingIcon";
import ItemStack, { ItemStackProps } from "./ItemStack";
import { Item } from "types/item";
import { formatNumber } from "util/fns/depot/itemUtils";

interface Props extends ItemStackProps {
  owned: number;
  isCrafting: boolean;
  canCompleteByCrafting: boolean;
  canCraftOne: boolean;
  hideIncrementDecrementButtons: boolean;
  onChange: (itemId: string, newQuantity: number) => void;
  onCraftingToggle: (itemId: string) => void;
  onCraftOne: (itemId: string) => void;
  onClick: (itemId: string) => void;
  component?: ElementType;
}

const ItemNeeded: React.FC<Props> = React.memo((props) => {
  const {
    owned,
    isCrafting,
    canCompleteByCrafting,
    canCraftOne,
    hideIncrementDecrementButtons,
    onChange,
    onCraftingToggle,
    onCraftOne,
    onClick,
    component,
    ...rest
  } = props;
  const { itemId, quantity } = rest;
  const item: Item = items[itemId as keyof typeof items];
  const isCraftable = Boolean(item.ingredients);
  const isComplete = owned >= quantity;
  const [rawValue, setRawValue] = useState<string>("");

  const [focused, setFocused] = useState(false);
  const textFieldRef = useRef<HTMLInputElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [abbrOwned, setAbbrOwned] = useState<string>(`${owned}`);

  useEffect(() => {
    setRawValue(`${owned}`);

    //all ItemNeeded-s render a lot: only recalc on change
    const abbrOwned = formatNumber(owned);
    setAbbrOwned(`${abbrOwned}`);
  }, [owned]);

  //keep focus on text field when clicking on Inc/Dec
  //to show rawValue and hide owned
  const handleFocusTimeout = () => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }
    focusTimeoutRef.current = setTimeout(() => {
      setFocused(false);
    }, 500);
  };

  //Inc/Dec additional handling: focus on text
  const IncDecOnChange = (newValue: number) => {
    setRawValue(`${newValue}`);
    onChange(itemId, newValue);
    setFocused(true);
    textFieldRef.current?.focus();
    handleFocusTimeout();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //return focus to textfield on any change
    setFocused(true);
    textFieldRef.current?.focus();

    const newRawValue = e.target.value;
    setRawValue(newRawValue);
    let numberValue = Number(newRawValue);
    if (!Number.isNaN(numberValue)) {
      //evade db error with more than integer.
      numberValue = Math.min(numberValue, Number.MAX_SAFE_INTEGER);
      onChange(itemId, numberValue);
    }
  };

  const craftOneButton = (
    <Button disabled={!isCrafting || !canCraftOne} onClick={() => onCraftOne(itemId)} sx={{ width: "auto" }}>
      +1
    </Button>
  );

  // Handle increment button click
  const handleIncrement = () => {
    const newValue = Number(rawValue) + 1;
    IncDecOnChange(newValue);
  };

  // Handle decrement button click
  const handleDecrement = () => {
    const newValue = Number(rawValue) - 1;
    IncDecOnChange(newValue);
  };

  return (
    <Box display="inline-grid" component={component ?? "div"}>
      <ButtonBase
        data-itemid={itemId}
        onClick={() => onClick(itemId)}
        disableRipple
        sx={{
          display: "inline-grid",
          alignSelf: "center",
          justifySelf: "center",
          "&:focus, &:active": {
            filter: "brightness(0.5)",
          },
          "& > *": {
            gridArea: "1 / -1",
          },
        }}
      >
        <ItemStack {...rest} sx={isComplete || (isCrafting && canCompleteByCrafting) ? { opacity: 0.4 } : undefined} />
        {quantity > 0 && isComplete && (
          <CheckCircleIcon
            htmlColor="currentColor"
            fontSize="large"
            sx={{
              alignSelf: "center",
              justifySelf: "center",
              zIndex: 1,
              color: "success.main",
            }}
          />
        )}
        {quantity > 0 && !isComplete && isCrafting && canCompleteByCrafting && (
          <Tooltip arrow title="Can be completed by crafting">
            <Box alignSelf="center" justifySelf="center" zIndex={1} lineHeight={0} sx={{ color: "warning.main" }}>
              <CraftingIcon />
            </Box>
          </Tooltip>
        )}
      </ButtonBase>
      <TextField
        size="small"
        value={focused ? rawValue : abbrOwned.toString()}
        onFocus={(e) => {
          e.target.select();
          setFocused(true);
        }}
        onBlur={handleFocusTimeout}
        onChange={handleChange}
        inputRef={textFieldRef}
        disabled={itemId === "EXP"}
        slotProps={{
          htmlInput: {
            type: focused ? "number" : "text",
            min: 0,
            step: 1,
            "aria-label": "Quantity owned",
            sx: {
              textAlign: focused && abbrOwned.search("[KM]") !== -1 ? "right" : "center",
              width: "5ch", // width of 4 "0" characters
              flexGrow: 1,
            },
          },
          input: hideIncrementDecrementButtons
            ? {
                sx: {
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                },
              }
            : {
                startAdornment: (
                  <InputAdornment position="start" sx={{ mr: 0 }}>
                    <IconButton
                      size="small"
                      aria-label="Remove 1 from owned amount"
                      edge="start"
                      disabled={Number(rawValue) <= 0}
                      onClick={() => handleDecrement()}
                    >
                      <RemoveCircleIcon />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end" sx={{ ml: 0 }}>
                    <IconButton
                      size="small"
                      aria-label="Add 1 to owned amount"
                      edge="end"
                      onClick={() => handleIncrement()}
                    >
                      <AddCircleIcon />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  px: "4px",
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  "& input": {
                    MozAppearance: "textfield",
                  },
                  "& input::-webkit-outer-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                  "& input::-webkit-inner-spin-button": {
                    WebkitAppearance: "none",
                    margin: 0,
                  },
                },
              },
        }}
      />
      <Box
        sx={{
          minWidth: 96,
          height: 32,
        }}
      >
        {isCraftable ? (
          <ButtonGroup
            size="small"
            fullWidth
            sx={{
              mt: "-1px",
              "& > button": {
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                height: 32,
              },
              "& > .MuiButtonGroup-grouped:not(:last-of-type)": {
                borderRightColor: "rgba(251, 192, 45, 0.5)",
              },
            }}
          >
            <Button
              variant={isCrafting ? "contained" : "outlined"}
              onClick={() => onCraftingToggle(itemId)}
              aria-label="Toggle crafting"
              aria-pressed={isCrafting}
            >
              {isCrafting ? "Crafting" : "Craft"}
            </Button>
            {isCrafting && craftOneButton}
          </ButtonGroup>
        ) : (
          <Button
            size="small"
            fullWidth
            variant="outlined"
            disabled
            sx={{
              mt: "-1px",
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }}
          >
            (Uncraftable)
          </Button>
        )}
      </Box>
    </Box>
  );
});
ItemNeeded.displayName = "ItemNeeded";
export default ItemNeeded;
