import React, { useState } from "react";
import { Box, Stack, Tab, Tabs, Typography } from "@mui/material";
import { Tune as TuneIcon } from "@mui/icons-material";

import ConfigurationTypesPanel from "../../components/admin/ConfigurationTypesPanel";
import ConfigurationProfilesPanel from "../../components/admin/ConfigurationProfilesPanel";

const ConfigurationRegistryPage: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <TuneIcon color="primary" />
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Configuration Registry
        </Typography>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        <Tab label="Configuration Types" />
        <Tab label="Configuration Profiles" />
      </Tabs>

      {tab === 0 && <ConfigurationTypesPanel />}
      {tab === 1 && <ConfigurationProfilesPanel />}
    </Box>
  );
};

export default ConfigurationRegistryPage;
