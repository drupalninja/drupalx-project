#!/bin/bash

for i in {1..19}; do
  ddev . drush dcer node $i --folder=profiles/custom/drupalx_demo/content/
done

for i in {1..8}; do
  ddev . drush dcer menu_link_content $i --folder=profiles/custom/drupalx_demo/content/
done
