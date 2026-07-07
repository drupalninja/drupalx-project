# 💧 Site Template Starter Kit

If you're here to create a site template for Drupal CMS, you've come to the right place; see [GET-STARTED.md](GET-STARTED.md).

**You should customize this file** and fill it with information about the fantastic site template you build with this starter kit. 🚀

A screenshot is a great way to start:

![A screenshot of my amazing site template.](screenshot.webp)

## Key Features
Describe who this site template is for, and what it does particularly well. For example:

* Designed for professional electricians
* Stellar content model with job management functionality
* A gorgeous theme that meets WCAG AAA standards
* E-commerce capabilities
* AI features that will amaze you
* Comes in any color you want

## Installation
These are generic instructions for how to install the finished site template; customize these however you want.

We recommend using DDEV 1.25.0 or later to set up your local Drupal development environment; see [DDEV's installation instructions](https://docs.ddev.com/en/stable/users/install). Once you have DDEV, you can set up this site template as follows:
```shell
mkdir my-project
cd my-project
ddev config --project-type=drupal11 --docroot=web
ddev composer create-project drupal/cms
ddev composer require drupal/MY_SITE_TEMPLATE_NAME
ddev launch
```
Replace `MY_SITE_TEMPLATE_NAME` with the actual name of your site template, from the `name` field of `composer.json`.

## Known Issues
Are there any bugs or gotchas you want end users to know about? List them here, along with any workarounds.

## Support
Provide a few links here where your end users can get help.
