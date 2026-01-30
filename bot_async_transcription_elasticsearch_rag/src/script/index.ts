import { create_elastic_indices } from "./elasticsearch_schema";

create_elastic_indices()
  .then(() => {
    console.log("[elasticsearch] created indices");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });