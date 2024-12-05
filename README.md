# DrupalX Standard Starter Template

[![CI](https://github.com/drupalninja/drupalx-project/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/drupalninja/drupalx-project/actions/workflows/ci.yml)
[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg)](https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)

This project template leverages the DrupalX Starter Kit distribution, featuring enhanced editorial capabilities, the DrupalX Theme Starter, and additional improvements through contributed modules.

## What does the template do?

* Extends the [drupal-composer/drupal-project](https://github.com/drupal-composer/drupal-project) template (visit the README for basic instructions).
* Adds additional contributed modules to the project via Composer.
* Sets up [DDEV](https://ddev.com/) as the default development environment.
* Includes the [DrupalX theme](https://github.com/drupalninja/drupalx_theme) starter kit.
* Configures the DrupalX configuration with paragraph types for page building.

## Installing

Create your project:

```bash
composer create-project drupalninja/drupalx-project:10.x-dev some-dir --no-interaction
```

Configure DDEV (follow prompts).

```bash
ddev config
```

Start DDEV, download Composer dependencies and install DrupalX CMS.

```bash
ddev install
```
