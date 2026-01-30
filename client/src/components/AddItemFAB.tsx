import React, { useState } from 'react';
...
const AddItemFAB = React.memo(({ onAdd, autocompleteOptions, sx }: AddItemFABProps) => {
  const [open, setOpen] = useState(false);
...
  );
});

export default AddItemFAB;
