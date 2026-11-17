Page({
  data: {
    title: '',
    focused: false,
  },

  onTitleInput(event) {
    this.setData({ title: event.detail.value });
  },

  onLabelTap() {
    this.setData({ focused: true });
  },

  onTitleFocus() {
    this.setData({ focused: true });
  },

  onTitleBlur() {
    this.setData({ focused: false });
  },
});
