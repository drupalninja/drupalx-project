<?php

declare(strict_types=1);

use Drupal\Tests\BrowserTestBase;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;

/**
 * Tests that this site template can be used to install Drupal.
 *
 * All deprecation notices triggered by the recipe's dependencies will be
 * displayed. To suppress them, add the
 * \PHPUnit\Framework\Attributes\IgnoreDeprecations attribute to this class.
 */
#[RunTestsInSeparateProcesses]
class InstallTest extends BrowserTestBase {

  /**
   * {@inheritdoc}
   */
  protected $defaultTheme = 'stark';

  /**
   * {@inheritdoc}
   */
  protected function installParameters(): array {
    $install = parent::installParameters();
    $install['parameters']['recipe'] = dirname(__FILE__, 4);
    return $install;
  }

  /**
   * Tests that the site template can be used to install Drupal.
   *
   * In general, you should not need to customize this method. Everything that
   * it's testing happens in the background during the install process, which is
   * handled by BrowserTestBase. So this doesn't really need to assert anything.
   */
  public function testInstall(): void {
    $this->expectNotToPerformAssertions();
  }

}
