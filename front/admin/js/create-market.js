(function () {
  'use strict';

  function initCreateMarket() {
    var draftBtn = document.getElementById('cm-save-draft');
    var submitBtn = document.getElementById('cm-submit');

    if (draftBtn) draftBtn.addEventListener('click', function () {
      if (!validateForm()) return;
      saveDraft();
    });

    if (submitBtn) submitBtn.addEventListener('click', function () {
      if (!validateForm()) return;
      createAndSubmit();
    });
  }

  function saveDraft() {
    var data = buildRequestBody();
    api.postApi('/api/markets', data)
      .then(function (market) {
        window.showToast('success', '草稿已儲存',
          '事件「' + market.title + '」已儲存為草稿（DRAFT）。');
        resetForm();
      })
      .catch(function (err) {
        window.showToast('danger', '儲存失敗', err.message);
      });
  }

  function createAndSubmit() {
    var data = buildRequestBody();
    api.postApi('/api/markets', data)
      .then(function (market) {
        return api.postApi('/api/markets/' + market.id + '/submit', null);
      })
      .then(function () {
        window.showToast('success', '送審成功', '事件已建立並送審（PENDING）。');
        resetForm();
      })
      .catch(function (err) {
        window.showToast('danger', '送審失敗', err.message);
      });
  }

  function buildRequestBody() {
    var closeAt = document.getElementById('cm-closeAt').value;
    if (closeAt && !closeAt.includes(':SS')) {
      closeAt += ':00';
    }
    return {
      title: document.getElementById('cm-title').value,
      description: document.getElementById('cm-description').value || null,
      category: document.getElementById('cm-category').value || null,
      marketType: document.querySelector('input[name="marketType"]:checked').value,
      sourceUrl: document.getElementById('cm-sourceUrl').value || null,
      resolutionRule: document.getElementById('cm-resolutionRule').value || null,
      closeAt: closeAt
    };
  }

  function validateForm() {
    var ids = ['cm-title', 'cm-category', 'cm-resolutionRule', 'cm-closeAt'];
    var valid = true;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        if (el) el.classList.add('is-invalid');
        valid = false;
      } else {
        if (el) el.classList.remove('is-invalid');
      }
    });
    if (!valid) {
      window.showToast('danger', '欄位不足', '請填寫所有必填欄位（標題、分類、裁決規則、截止時間）。');
    }
    return valid;
  }

  function resetForm() {
    document.getElementById('create-market-form').reset();
    document.querySelectorAll('.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });
  }

  window.initCreateMarket = initCreateMarket;
})();
