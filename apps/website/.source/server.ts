// @ts-nocheck
import * as __fd_glob_2 from "../content/docs/index.mdx?collection=docs"
import * as __fd_glob_1 from "../content/docs/getting-started.mdx?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { fromConfig } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = fromConfig<typeof Config>();

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, }, {"getting-started.mdx": __fd_glob_1, "index.mdx": __fd_glob_2, });