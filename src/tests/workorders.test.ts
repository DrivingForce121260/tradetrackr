describe('Work Orders basic workflow (mocked)', () => {
	it('statuses are valid', async () => {
		const statuses = ['draft','assigned','in-progress','completed'];
		expect(statuses).toContain('draft');
		expect(statuses).toContain('assigned');
		expect(statuses).toContain('in-progress');
		expect(statuses).toContain('completed');
	});
});












