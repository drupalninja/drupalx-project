// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

/**
 * Login as a user.
 *
 * @param {object} user
 *   - user.mail = email address
 *   - user.password
 *   - user.username
 *   - user.roles
 */
Cypress.Commands.add('login', (user) => {
  cy.visit('user/login')

  cy.get('#edit-name').type(user.username)
  cy.get('#edit-pass').type(user.password)
  cy.get('#edit-submit').click()
})

/**
 * @link https://medium.com/@nickdenardis/getting-cypress-js-to-interact-with-ckeditor-f46eec01132f
 */
Cypress.Commands.add("type_ckeditor", (element, content) => {
  cy.window()
    .then(win => {
      win.CKEDITOR.instances[element].setData(content);
    });
});

// Add drush command.
Cypress.Commands.add('drush', (command, args = [], options = {}, stopOnError = true) => {
  let execOptions = {};
  if (!stopOnError) {
    execOptions = { 'failOnNonZeroExit': false };
  }

  return cy.exec(`${Cypress.env('drushCommand')} ${command} ${stringifyArguments(args)} ${stringifyOptions(options)} -y`, execOptions);
});


// Add command to create a user with a role.
Cypress.Commands.add('createUserWithRole', (name, email = '', roles = []) => {
  Cypress.log({
    message: `Canceling ${email} account, if it exists.`
  });
  cy.drush('user:cancel', ['--delete-content', name], {}, false);

  Cypress.log({
    message: `Creating ${name} account.`
  });

  let createArgs = [name];
  if (email != '') {
    createArgs.push('--mail', email);
  }
  cy.drush('user:create', createArgs)
    .then(obj => {

      const uid = obj.stderr.match(/Created a new user with uid ([0-9]+)/)[1];
      cy.log(uid);

      roles.forEach(role => {
        cy.drush('user:role:add', [role, name]);

        Cypress.log({
          message: `Assigned ${role} role`,
        })
      });
      cy.wrap({
        name,
        uid
      });
    });
});


// Command to set user password.
Cypress.Commands.add('setUserPassword', (name, password = 'password') => {

  Cypress.log({
    message: `Setting password for ${name} account`
  });

  cy.drush('user:password', [name, password]);
});

// Command to delete user.
Cypress.Commands.add('deleteUser', (name) => {
  Cypress.log({
    message: `Canceling ${name} account, if it exists.`
  });
  cy.drush('user:cancel', ['--delete-content', name]);
});

// Command to login using uid.
Cypress.Commands.add("loginByUid", (uid) => {
  // Add to session so we can resuse the login for different tests.
  cy.session([uid], () => {
    cy.drush('user:login', ['--uid', uid])
      .its('stdout')
      .then(function (url) {
        cy.visit(url);
      });
  });
});

// Command to login with email.
//
// Pass in the uid if you're using `cy.createUserWithRole()` to create accounts
// during testing. This will ensure a new session is created if the tests is
// rerun and the account is re-created.
//
// @see access-authenticated.cy
Cypress.Commands.add("loginWithEmail", (mail, uid = '') => {

  // Add to session so we can resuse the login for different tests.
  cy.session([mail, uid], () => {
    cy.drush('user:login', ['--mail', mail])
      .its('stdout')
      .then(function (url) {
        cy.visit(url);
      })
  });
});

/**
 * Join args into a string (space delimited).
 *
 * @param {*} args
 * @returns string
 */
function stringifyArguments(args) {
  return args.join(' ');
}

/**
 * Join args into a string (space delimited).
 *
 * @param {array} options
 * @returns string
 */
function stringifyOptions(options) {
  return Object.keys(options).map(option => {
    let output = `--${option}`;

    if (options[option] === true) {
      return output;
    }

    if (options[option] === false) {
      return '';
    }

    if (typeof options[option] === 'string') {
      output += `="${options[option]}"`;
    }
    else {
      output += `=${options[option]}`;
    }

    return output;
  }).join(' ');
}
