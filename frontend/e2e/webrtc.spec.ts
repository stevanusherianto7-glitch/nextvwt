import { test, expect } from '@playwright/test';

test.describe('NextVWT P2P WebRTC E2E Test Suite', () => {
  test('should establish direct P2P connection between Abi and Anto on Channel 101', async ({ browser }) => {
    console.log('[E2E Test] Memulai uji skenario multi-tab WebRTC Mesh P2P...');

    // 1. Buat sesi browser pertama untuk Abi
    const contextAbi = await browser.newContext();
    const pageAbi = await contextAbi.newPage();
    await pageAbi.goto('/');

    // Handle Auth Screen (Login)
    const usernameAuthAbi = pageAbi.locator('input[placeholder="Masukkan username"]');
    await expect(usernameAuthAbi).toBeVisible({ timeout: 15000 });
    await usernameAuthAbi.fill('Abi');
    await pageAbi.locator('input[placeholder="Masukkan kata sandi"]').fill('password123');
    await pageAbi.locator('button:has-text("Masuk ke Sistem")').click();

    // Tunggu LCD terlihat dan nyalakan sistem via switch
    await pageAbi.locator('.power-container').click();

    // Tunggu proses inisialisasi / otorisasi (boot sequence: off -> fetching -> authorizing -> complete)
    console.log('[E2E Test] Menunggu boot sequence Abi...');
    await pageAbi.waitForTimeout(4500); // 3 detik boot sequence + buffer

    // Verifikasi nama "Abi" muncul di LCD
    await expect(pageAbi.locator('text=Abi')).toBeVisible();

    // Naikkan channel dari 100 ke 101 menggunakan tombol D-Pad Up
    console.log('[E2E Test] Mengubah channel Abi ke 101...');
    await pageAbi.locator('#dpad-up').click();
    await pageAbi.waitForTimeout(500);

    // 2. Buat sesi browser kedua untuk Anto
    const contextAnto = await browser.newContext();
    const pageAnto = await contextAnto.newPage();
    await pageAnto.goto('/');

    // Handle Auth Screen (Login)
    const usernameAuthAnto = pageAnto.locator('input[placeholder="Masukkan username"]');
    await expect(usernameAuthAnto).toBeVisible({ timeout: 15000 });
    await usernameAuthAnto.fill('Anto');
    await pageAnto.locator('input[placeholder="Masukkan kata sandi"]').fill('password123');
    await pageAnto.locator('button:has-text("Masuk ke Sistem")').click();

    // Tunggu LCD terlihat dan nyalakan sistem via switch
    await pageAnto.locator('.power-container').click();

    console.log('[E2E Test] Menunggu boot sequence Anto...');
    await pageAnto.waitForTimeout(4500);

    // Verifikasi nama "Anto" muncul di LCD
    await expect(pageAnto.locator('text=Anto')).toBeVisible();

    // Naikkan channel Anto ke 101 agar sama dengan Abi
    console.log('[E2E Test] Mengubah channel Anto ke 101...');
    await pageAnto.locator('#dpad-up').click();
    await pageAnto.waitForTimeout(2000); // Tunggu negosiasi WebRTC P2P selesai

    // 3. Verifikasi Kehadiran Pengguna Aktif (Presence)
    console.log('[E2E Test] Memverifikasi kehadiran di dalam channel...');
    
    // Buka Modal Daftar Pengguna di tab Abi
    await pageAbi.locator('#user-list-btn').click();
    await expect(pageAbi.locator('text=Anto').first()).toBeVisible();

    // Buka Modal Daftar Pengguna di tab Anto
    await pageAnto.locator('#user-list-btn').click();
    await expect(pageAnto.locator('text=Abi').first()).toBeVisible();

    // 4. Verifikasi modulasi PTT dari posisi Station List
    console.log('[E2E Test] Menekan PTT Abi dari Station List & memastikan Anto tidak bisa menabrak modulasi...');
    const pttButtonAbi = pageAbi.locator('#ptt-button');
    const pttButtonAnto = pageAnto.locator('#ptt-button');
    await expect(pttButtonAbi).toBeVisible();

    // Gunakan interaksi mouse click riil
    await pttButtonAbi.click();
    await pageAbi.waitForTimeout(1500); // tunggu propagasi transmisi

    // Station List tetap terbuka; PTT tidak boleh menutup panel daftar user
    await expect(pageAbi.locator('[data-testid="joined-users"]')).toBeVisible();
    await expect(pageAbi.locator('[data-testid="modulating-user-card"]').filter({ hasText: 'Abi' }).first()).toBeVisible();

    // Di tab Abi: tombol PTT harus berubah ke state modulasi meski LCD sedang diganti Station List
    await expect(pttButtonAbi).toHaveAttribute('data-state', 'modulating');

    // Di tab Anto: tombol tetap hijau/PTT, tetapi channel ditandai sibuk agar tidak bisa menabrak modulasi
    await expect(pttButtonAnto).toHaveAttribute('data-state', 'busy');
    await expect(pttButtonAnto).toHaveAttribute('data-channel-busy', 'true');
    await expect(pttButtonAnto).toContainText('PTT');

    // Lepaskan tombol PTT Abi (Click ulang untuk mode Standby Toggle)
    console.log('[E2E Test] Melepas PTT Abi (Standby)...');
    await pttButtonAbi.click();
    await pageAbi.waitForTimeout(1500);

    // Pastikan tombol Anto kembali siap setelah modulasi selesai
    await expect(pttButtonAnto).toHaveAttribute('data-state', 'idle');
    await expect(pttButtonAnto).toHaveAttribute('data-channel-busy', 'false');

    // Bersihkan sesi browser
    console.log('[E2E Test] Skenario E2E WebRTC Mesh P2P sukses!');
    await contextAbi.close();
    await contextAnto.close();
  });
});
